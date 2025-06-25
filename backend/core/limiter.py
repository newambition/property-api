from slowapi import Limiter
from slowapi.util import get_remote_address

# This central limiter can be used by the main app (for default limits)
# and by specific endpoints (for custom limits).
limiter = Limiter(key_func=get_remote_address, default_limits=["20/minute"])