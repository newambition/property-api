from fastapi import APIRouter
from api.v1.endpoints import sold_prices, epc

api_router = APIRouter()
api_router.include_router(sold_prices.router, prefix="/property", tags=["Property Data"])
api_router.include_router(epc.router, prefix="/property", tags=["Property Data"])
