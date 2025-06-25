from typing import List
import pandas as pd
import pgeocode
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm.session import Session
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from core.security import get_api_key
from db.session import get_db
from core.limiter import limiter
from models.price_paid import PricePaid
from models.property import PropertySoldPrice


router = APIRouter()
geo = pgeocode.Nominatim('gb')

def geocode_postcode(postcode: str) -> Point | None:
    """Converts a UK postcode into a geographic Point (longitude, latitude)."""
    location = geo.query_postal_code(postcode)
    if not pd.isna(location.longitude) and not pd.isna(location.latitude):
        return Point(location.longitude, location.latitude)
    return None



@router.get(
    "/sold-prices",
    response_model=List[PropertySoldPrice],
    summary="Get Sold Property Prices Near a BCP Postcode",
    dependencies=[Depends(get_api_key)],
)
@limiter.limit("15/minute")
async def get_sold_prices(
    request: Request,
    postcode: str,
    radius_km: float = 1.0,
    street_name: str | None = None,
    db: Session = Depends(get_db)
):
    """
    Retrieves historical property sales data within a specified radius of a given postcode.
    """
    center_point = geocode_postcode(postcode)
    if not center_point:
        raise HTTPException(status_code=404, detail="Postcode not found or invalid.")
    

    radius_m = radius_km * 1000
    

    try:
            query = db.query(PricePaid)
            query = query.filter(func.ST_DWithin(
                PricePaid.location,
                from_shape(center_point, srid=4326),
                radius_m
            ))
            if street_name:
                query = query.filter(PricePaid.street.ilike(f"%{street_name}%"))
            results = query.order_by(PricePaid.date_of_transfer.desc()).limit(100).all()
    
    except Exception as e:
        print(f"Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during data retrieval.")
    

    response_data = []
    for prop in results:
        address_parts = [prop.paon, prop.saon, prop.street]
        address = " ".join(filter(None, address_parts))
        response_data.append(
            PropertySoldPrice(
                price=prop.price,
                date_of_transfer=prop.date_of_transfer.isoformat(),
                postcode=prop.postcode,
                property_type=prop.property_type,
                new_build=prop.new_build_flag == 'Y',
                tenure=prop.tenure_type,
                address=address,
                latitude=prop.location.y,
                longitude=prop.location.x,
            )
        )
    return response_data