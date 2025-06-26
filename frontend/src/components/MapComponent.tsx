import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import useApi from "../hooks/useApi";
import type { SoldProperty, SearchParams } from "../types/property";

interface MapComponentProps {
  searchParams: SearchParams;
}

// Enhanced property type with geocoded coordinates
interface EnhancedProperty extends SoldProperty {
  geocoded_latitude?: number;
  geocoded_longitude?: number;
  geocoding_attempted?: boolean;
}

// Fix for default marker icon issue with webpack
// @ts-expect-error - L.icon is not typed correctly in the community types
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

// Geocoding service using OpenStreetMap Nominatim
const geocodeAddress = async (
  address: string,
  postcode: string
): Promise<{ lat: number; lng: number } | null> => {
  try {
    // Clean up address and create search query
    const cleanAddress = address.replace(/NaN\s+/g, "").trim();
    const searchQuery = `${cleanAddress}, ${postcode}, UK`;

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=gb&limit=1&addressdetails=1`,
      {
        headers: {
          "User-Agent": "PropertyAPI/1.0 (your-email@example.com)", // Replace with your app info
        },
      }
    );

    if (!response.ok) throw new Error("Geocoding failed");

    const data = await response.json();

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    return null;
  } catch (error) {
    console.warn(`Failed to geocode address: ${address}`, error);
    return null;
  }
};

// Component to handle map events
const MapEventHandler = ({
  onZoomChange,
}: {
  onZoomChange: (zoom: number) => void;
}) => {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
};

const MapComponent = ({ searchParams }: MapComponentProps) => {
  const [currentZoom, setCurrentZoom] = useState(13);
  const [geocodedProperties, setGeocodedProperties] = useState<
    Map<string, { lat: number; lng: number }>
  >(new Map());
  const geocodingCache = useRef<
    Map<string, { lat: number; lng: number } | null>
  >(new Map());

  // Build API parameters from search params
  const apiParams = {
    postcode: searchParams.postcode,
    radius_km: searchParams.radius,
    ...(searchParams.street && { street_name: searchParams.street }),
  };

  const {
    data: properties,
    loading,
    error,
  } = useApi<SoldProperty[]>("/property/sold-prices", apiParams);

  // Geocode addresses when zoomed in to street level
  useEffect(() => {
    const shouldUseAddressGeocoding = currentZoom >= 15;

    if (shouldUseAddressGeocoding && properties) {
      const geocodeProperties = async () => {
        const propertiesToGeocode = properties.filter((prop) => {
          const cacheKey = `${prop.address}-${prop.postcode}`;
          return (
            !geocodingCache.current.has(cacheKey) &&
            prop.address &&
            !prop.address.includes("NaN NaN")
          );
        });

        // Limit concurrent geocoding requests
        const batchSize = 5;
        for (let i = 0; i < propertiesToGeocode.length; i += batchSize) {
          const batch = propertiesToGeocode.slice(i, i + batchSize);

          const geocodePromises = batch.map(async (prop) => {
            const cacheKey = `${prop.address}-${prop.postcode}`;

            // Add delay to respect rate limits
            await new Promise((resolve) =>
              setTimeout(resolve, 200 * (i / batchSize))
            );

            const coords = await geocodeAddress(prop.address, prop.postcode);
            geocodingCache.current.set(cacheKey, coords);

            if (coords) {
              setGeocodedProperties(
                (prev) => new Map(prev.set(prop.transaction_id, coords))
              );
            }
          });

          await Promise.all(geocodePromises);
        }
      };

      geocodeProperties();
    }
  }, [currentZoom, properties]);

  // Function to get the appropriate coordinates for a property
  const getPropertyCoordinates = (prop: SoldProperty): [number, number] => {
    const shouldUseAddressGeocoding = currentZoom >= 15;

    if (shouldUseAddressGeocoding) {
      const geocoded = geocodedProperties.get(prop.transaction_id);
      if (geocoded) {
        return [geocoded.lat, geocoded.lng];
      }
    }

    // Fall back to postcode coordinates (with distribution if needed)
    return [prop.latitude!, prop.longitude!];
  };

  // Function to add small random offsets to properties with identical coordinates
  // Only used for postcode-level coordinates at lower zoom levels
  const addSpatialDistribution = (properties: SoldProperty[]) => {
    if (currentZoom >= 15) {
      // At high zoom, use actual coordinates without distribution
      return properties;
    }

    const coordinateGroups = new Map<string, SoldProperty[]>();

    // Group properties by identical coordinates
    properties.forEach((prop) => {
      if (prop.latitude && prop.longitude) {
        const key = `${prop.latitude.toFixed(6)},${prop.longitude.toFixed(6)}`;
        if (!coordinateGroups.has(key)) {
          coordinateGroups.set(key, []);
        }
        coordinateGroups.get(key)!.push(prop);
      }
    });

    // Add small random offsets to grouped properties
    coordinateGroups.forEach((groupProps, coords) => {
      if (groupProps.length > 1) {
        // Calculate circle distribution for multiple properties at same location
        const radius = Math.min(0.001, 0.0003 * Math.sqrt(groupProps.length)); // Max ~100m offset

        groupProps.forEach((prop, index) => {
          // Distribute in a circle around the original point
          const angle = (2 * Math.PI * index) / groupProps.length;
          const offsetRadius = radius * (0.3 + 0.7 * Math.random()); // Random radius within circle

          // Add deterministic but seemingly random offset based on transaction ID
          const hashOffset =
            (prop.transaction_id
              .split("")
              .reduce((a, b) => a + b.charCodeAt(0), 0) %
              1000) /
            1000;
          const adjustedAngle = angle + (hashOffset * Math.PI) / 4; // Add up to 45° variation

          prop.latitude! += offsetRadius * Math.cos(adjustedAngle);
          prop.longitude! += offsetRadius * Math.sin(adjustedAngle);
        });
      }
    });

    return properties;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading property data...</p>
          <p className="text-sm text-gray-500">
            Searching {searchParams.postcode} within {searchParams.radius} km
            {searchParams.street && ` on ${searchParams.street}`}
          </p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error fetching data</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs text-gray-500 mt-2">
            Check your search parameters and try again
          </p>
        </div>
      </div>
    );

  const propertiesWithCoordinates = properties?.filter(
    (prop) => prop.latitude && prop.longitude
  );

  // Apply spatial distribution for lower zoom levels
  const distributedProperties = propertiesWithCoordinates
    ? addSpatialDistribution([...propertiesWithCoordinates])
    : [];

  // Custom cluster options for better zoom-based clustering
  const clusterOptions = {
    // Show individual markers when zoomed in to level 16 or higher
    disableClusteringAtZoom: 16,

    // Maximum radius for clustering - smaller radius = more, smaller clusters
    maxClusterRadius: (zoom: number) => {
      if (zoom <= 11) return 80; // Large clusters when zoomed out
      if (zoom <= 13) return 50; // Medium clusters
      if (zoom <= 15) return 25; // Small clusters
      return 10; // Very small clusters before individual markers
    },

    // Minimum points to form a cluster
    minPts: 2,

    // Custom cluster icon creation
    iconCreateFunction: (cluster: any) => {
      const count = cluster.getChildCount();
      let size = "small";
      let className = "marker-cluster-small";

      if (count >= 100) {
        size = "large";
        className = "marker-cluster-large";
      } else if (count >= 20) {
        size = "medium";
        className = "marker-cluster-medium";
      }

      return new L.DivIcon({
        html: `<div><span>${count}</span></div>`,
        className: `marker-cluster ${className}`,
        iconSize: new L.Point(40, 40),
      });
    },

    // Animation options
    animate: true,
    animateAddingMarkers: true,

    // When you click a cluster, zoom to fit its bounds
    zoomToBoundsOnClick: true,

    // Show coverage area when you hover over a cluster
    showCoverageOnHover: false,

    // Custom spiderfication (when markers are very close)
    spiderfyOnMaxZoom: true,
    spiderfyDistanceMultiplier: 1.5,
  };

  return (
    <>
      {/* Add custom CSS for cluster styling */}
      <style>{`
        .marker-cluster-small {
          background-color: rgba(181, 226, 140, 0.8);
          border: 2px solid rgba(110, 160, 80, 0.8);
        }
        .marker-cluster-small div {
          background-color: rgba(110, 160, 80, 0.8);
          border-radius: 20px;
          width: 36px;
          height: 36px;
          margin-left: 2px;
          margin-top: 2px;
          text-align: center;
          line-height: 36px;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }
        
        .marker-cluster-medium {
          background-color: rgba(241, 211, 87, 0.8);
          border: 2px solid rgba(200, 170, 60, 0.8);
        }
        .marker-cluster-medium div {
          background-color: rgba(200, 170, 60, 0.8);
          border-radius: 20px;
          width: 36px;
          height: 36px;
          margin-left: 2px;
          margin-top: 2px;
          text-align: center;
          line-height: 36px;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }
        
        .marker-cluster-large {
          background-color: rgba(253, 156, 115, 0.8);
          border: 2px solid rgba(220, 120, 80, 0.8);
        }
        .marker-cluster-large div {
          background-color: rgba(220, 120, 80, 0.8);
          border-radius: 20px;
          width: 36px;
          height: 36px;
          margin-left: 2px;
          margin-top: 2px;
          text-align: center;
          line-height: 36px;
          font-size: 12px;
          font-weight: bold;
          color: white;
        }

        .address-geocoded-marker {
          filter: hue-rotate(120deg) brightness(1.1);
        }
      `}</style>

      <MapContainer
        center={[50.715, -1.98]} // Centered on Poole
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <MapEventHandler onZoomChange={setCurrentZoom} />

        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* MarkerClusterGroup with custom clustering behavior */}
        <MarkerClusterGroup {...clusterOptions}>
          {distributedProperties?.map((prop) => {
            const coords = getPropertyCoordinates(prop);
            const isGeocoded =
              currentZoom >= 15 && geocodedProperties.has(prop.transaction_id);

            return (
              <Marker
                key={prop.transaction_id}
                position={coords}
                icon={
                  isGeocoded
                    ? new L.Icon({
                        iconUrl:
                          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
                        iconRetinaUrl:
                          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
                        shadowUrl:
                          "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41],
                        className: "address-geocoded-marker",
                      })
                    : undefined
                }
              >
                <Popup>
                  <div className="min-w-48">
                    <p className="font-semibold text-sm">{prop.address}</p>
                    <p className="text-green-600 font-bold text-lg">
                      £{prop.price.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Date:</strong> {prop.date_of_transfer}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Type:</strong> {prop.property_type}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Postcode:</strong> {prop.postcode}
                    </p>
                    {prop.new_build && (
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-1">
                        New Build
                      </span>
                    )}
                    {isGeocoded && (
                      <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-1">
                        📍 Address Geocoded
                      </span>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>

        {/* Show results count and geocoding status in bottom right */}
        <div className="leaflet-bottom leaflet-right">
          <div className="leaflet-control leaflet-bar bg-white p-2 text-sm">
            <div>{distributedProperties?.length || 0} properties found</div>
            {currentZoom >= 15 && (
              <div className="text-xs text-green-600 mt-1">
                📍 {geocodedProperties.size} address-geocoded
              </div>
            )}
            {currentZoom >= 15 && geocodedProperties.size === 0 && (
              <div className="text-xs text-orange-600 mt-1">
                🔄 Geocoding addresses...
              </div>
            )}
          </div>
        </div>
      </MapContainer>
    </>
  );
};

export default MapComponent;
