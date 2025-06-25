import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import useApi from "../hooks/useApi";
import type { SoldProperty } from "../types/property";
import type { EpcProperty } from "../types/property";

// Fix for default marker icon issue with webpack
// @ts-expect-error - L.icon is not typed correctly in the community types
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const MapComponent = () => {
  const {
    data: properties,
    loading,
    error,
  } = useApi<SoldProperty[]>("/property/sold-prices", {
    postcode: "BH15 1DA", // Default search location
    radius_km: 1, // A wider radius to get plenty of initial data
  });

  if (loading)
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading map data...</p>
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center h-full">
        <p>Error fetching data: {error}</p>
      </div>
    );

  return (
    <MapContainer
      center={[50.715, -1.98]} // Centered on Poole
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* MarkerClusterGroup handles displaying many markers efficiently */}
      <MarkerClusterGroup>
        {properties?.map((prop) => {
          if (prop.latitude && prop.longitude) {
            return (
              <Marker
                key={prop.transaction_id}
                position={[prop.latitude, prop.longitude]}
              >
                <Popup>
                  <b>Address:</b> {prop.address} <br />
                  <b>Price:</b> £{prop.price.toLocaleString()} <br />
                  <b>Date:</b> {prop.date_of_transfer}
                </Popup>
              </Marker>
            );
          }
          return null;
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
};

export default MapComponent;
