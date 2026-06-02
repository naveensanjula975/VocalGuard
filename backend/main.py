"""
VocalGuard API — application entry-point.

This file is the **composition root**: it wires together configuration,
middleware, exception handlers, and versioned route modules.  It
contains zero business logic.

URL structure:
    /v1/auth/…        – authentication
    /v1/analyses/…    – core CRUD + detection
    /v1/demo/…        – public trial endpoints
    /v1/debug/…       – development utilities
    /…                – legacy backward-compat shims (hidden from docs)
"""

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import ALLOWED_ORIGINS, API_V1_PREFIX, FIREBASE_WEB_API_KEY
from exceptions import register_exception_handlers
from services.firebase_config import initialize_firebase
from asgi_correlation_id import CorrelationIdMiddleware
from rate_limiter import limiter

# ---------------------------------------------------------------------------
# Validate critical config (fail-fast)
# ---------------------------------------------------------------------------
if not FIREBASE_WEB_API_KEY:
    raise ValueError(
        "FIREBASE_WEB_API_KEY environment variable must be set. "
        "Copy .env.example → .env and fill in your Firebase credentials."
    )

# ---------------------------------------------------------------------------
# Create app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="VocalGuard API",
    description="AI-powered audio deepfake detection",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Middleware & State
# ---------------------------------------------------------------------------
app.state.limiter = limiter

app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Firebase
# ---------------------------------------------------------------------------
initialize_firebase()

# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------
register_exception_handlers(app)

# ---------------------------------------------------------------------------
# Versioned routes — /v1/…
# ---------------------------------------------------------------------------
from routes.auth import router as auth_router            # noqa: E402
from routes.analyses import router as analyses_router    # noqa: E402
from routes.demo import router as demo_router            # noqa: E402
from routes.debug import router as debug_router          # noqa: E402
from routes.explain import router as explain_router      # noqa: E402

v1 = APIRouter(prefix=API_V1_PREFIX)
v1.include_router(auth_router)
v1.include_router(analyses_router)
v1.include_router(demo_router)
v1.include_router(debug_router)
v1.include_router(explain_router)    # POST /api/v1/explain

app.include_router(v1)

# ---------------------------------------------------------------------------
# Legacy backward-compat shims — old paths (hidden from OpenAPI docs)
# ---------------------------------------------------------------------------
from routes.legacy import router as legacy_router        # noqa: E402

app.include_router(legacy_router)

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/", tags=["health"])
async def root():
    return {"message": "Welcome to VocalGuard API", "version": "1.0.0", "docs": "/docs"}


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
async def ready():
    """Liveness probe for container orchestration."""
    return {"status": "ready"}


# ---------------------------------------------------------------------------
# Dev entry-point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)