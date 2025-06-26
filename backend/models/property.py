from typing import Optional
from pydantic import BaseModel


class PropertySoldPrice(BaseModel):
    """Defines the data structure for a single sold property price record returned by the API."""
    transaction_id: str
    price: int
    date_of_transfer: str
    postcode: str
    property_type: str
    new_build: bool
    tenure: str
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class PropertyEpc(BaseModel):
    """Defines the data structure for a single EPC record."""
    address: str
    postcode: str
    lodgement_date: str
    uprn: Optional[str] = None
    current_energy_rating: str
    potential_energy_rating: str
    total_floor_area_sqm: Optional[float] = None
    property_type: str
    
    class Config:
        orm_mode = True