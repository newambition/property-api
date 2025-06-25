from fastapi import FastAPI
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from api.v1.api import api_router
from core.config import settings

# --- API Security: Rate Limiting ---
limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="An API for accessing UK property data, focused on the Bournemouth, Christchurch, and Poole area.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.include_router(api_router, prefix=settings.API_V1_STR)