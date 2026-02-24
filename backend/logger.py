"""
Structured logging configuration for the backend.

Usage:
    from backend.logger import get_logger
    logger = get_logger(__name__)
    logger.info("something happened", extra={"user_id": uid})
"""

import logging
import sys
import structlog

# We define a context var for the correlation ID
from asgi_correlation_id.context import correlation_id

def _add_correlation_id(logger, method_name, event_dict):
    """Add correlation ID to the log event if it exists."""
    req_id = correlation_id.get()
    if req_id:
        event_dict["correlation_id"] = req_id
    return event_dict

# Configure structlog globally
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        _add_correlation_id,
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    """Return a configured structlog logger."""
    import os
    level_str = os.environ.get("LOG_LEVEL", "INFO")
    level = getattr(logging, level_str.upper(), logging.INFO)
    
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=level,
    )
    return structlog.get_logger(name)
