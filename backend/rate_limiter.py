import hashlib
from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

def get_client_id(request: Request) -> str:
    """Return an identity key for rate limiting.
    
    Uses a hash of the Bearer token if present (per-user approximation),
    otherwise falls back to IP address (per-IP).
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        # Hash token to avoid keeping sensitive data in memory
        return hashlib.sha256(token.encode("utf-8")).hexdigest()
    
    return get_remote_address(request)

# Global rate limiter instance
limiter = Limiter(key_func=get_client_id)
