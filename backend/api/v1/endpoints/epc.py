from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm.session import Session

from core.limiter import limiter
from core.security import get_api_key
from db.session import get_db
from models.epc import EpcData
from models.property import PropertyEpc

router = APIRouter()

@router.get(
    "/epc",
    response_model=List[PropertyEpc],
    summary="Get Energy Performance Certificate (EPC) data by postcode",
    dependencies=[Depends(get_api_key)]
)
@limiter.limit("15/minute")
async def get_epc_by_postcode(
    request: Request,
    postcode: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves EPC data for properties matching a given postcode.
    
    - **postcode**: The UK postcode to search for (case-insensitive, ignores spaces).
    """
    # Sanitize postcode for reliable matching
    clean_postcode = "".join(postcode.split()).upper()
    
    try:
        results = (
            db.query(EpcData)
            .filter(EpcData.postcode == clean_postcode)
            .order_by(EpcData.lodgement_date.desc())
            .limit(100)
            .all()
        )
    except Exception as e:
        print(f"EPC Database query failed: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during data retrieval.")

    # Custom mapping to match the Pydantic model
    response_data = []
    for prop in results:
        response_data.append(
            PropertyEpc(
                address=prop.address,
                postcode=prop.postcode,
                lodgement_date=prop.lodgement_date.isoformat(),
                uprn=prop.uprn,
                current_energy_rating=prop.current_energy_rating,
                potential_energy_rating=prop.potential_energy_rating,
                total_floor_area_sqm=prop.total_floor_area,
                property_type=prop.property_type
            )
        )
    return response_data