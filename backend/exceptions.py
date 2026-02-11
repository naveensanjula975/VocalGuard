"""
Global exception handlers.

Standardises error response shape across all endpoints so clients
always receive::

    {"error": "<message>"}

with an appropriate HTTP status code.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from logger import get_logger

logger = get_logger(__name__)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach global exception handlers to *app*."""

    @app.exception_handler(ValueError)
    async def value_error_handler(_request: Request, exc: ValueError) -> JSONResponse:
        logger.warning("ValueError: %s", exc)
        return JSONResponse(status_code=400, content={"error": str(exc)})

    @app.exception_handler(FileNotFoundError)
    async def file_not_found_handler(_request: Request, exc: FileNotFoundError) -> JSONResponse:
        logger.warning("FileNotFoundError: %s", exc)
        return JSONResponse(status_code=404, content={"error": str(exc)})

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled exception")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"},
        )
