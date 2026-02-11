"""
Firebase initialisation.

Call ``initialize_firebase()`` exactly once during application startup
(in ``main.py``).  Do NOT call it at module-import time — that makes
the module impossible to import in tests or CLI scripts without a live
Firebase project.
"""

import firebase_admin
from firebase_admin import credentials
from pathlib import Path

from logger import get_logger

logger = get_logger(__name__)

# Candidate locations for the service-account key, checked in order.
_KEY_SEARCH_PATHS = [
    Path(__file__).resolve().parent.parent / "config" / "serviceAccountKey.json",
    Path(__file__).resolve().parent.parent / "serviceAccountKey.json",
]


def initialize_firebase() -> None:
    """Initialise the Firebase Admin SDK (idempotent)."""
    try:
        firebase_admin.get_app()
        return  # already initialised
    except ValueError:
        pass  # not yet initialised — continue

    key_path = next((p for p in _KEY_SEARCH_PATHS if p.exists()), None)
    if key_path is None:
        raise FileNotFoundError(
            "serviceAccountKey.json not found in any expected location: "
            + ", ".join(str(p) for p in _KEY_SEARCH_PATHS)
        )

    cred = credentials.Certificate(str(key_path))
    firebase_admin.initialize_app(cred)
    logger.info("Firebase initialised successfully (key: %s)", key_path.name)