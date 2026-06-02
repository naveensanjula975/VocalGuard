"""
Firebase initialisation.

Call ``initialize_firebase()`` exactly once during application startup
(in ``main.py``).  Supports two credential sources, checked in order:

1. ``FIREBASE_SERVICE_ACCOUNT_JSON`` env var — base64-encoded JSON string.
   Used in production (Heroku) where no filesystem is available.
2. File search — ``config/serviceAccountKey.json`` relative to backend root.
   Used in local development.
"""

import base64
import json
import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials

from logger import get_logger

logger = get_logger(__name__)

_KEY_SEARCH_PATHS = [
    Path(__file__).resolve().parent.parent / "config" / "serviceAccountKey.json",
    Path(__file__).resolve().parent.parent / "serviceAccountKey.json",
]


def initialize_firebase() -> None:
    """Initialise the Firebase Admin SDK (idempotent)."""
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        pass

    # --- Production path: base64 env var ---
    b64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    if b64:
        try:
            json_bytes = base64.b64decode(b64)
            service_account_info = json.loads(json_bytes)
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            logger.info("Firebase initialised from FIREBASE_SERVICE_ACCOUNT_JSON env var")
            return
        except Exception as exc:
            raise ValueError(
                "FIREBASE_SERVICE_ACCOUNT_JSON is set but could not be decoded. "
                "Ensure it is valid base64-encoded JSON."
            ) from exc

    # --- Development path: file search ---
    key_path = next((p for p in _KEY_SEARCH_PATHS if p.exists()), None)
    if key_path is None:
        raise FileNotFoundError(
            "Firebase credentials not found. Either set FIREBASE_SERVICE_ACCOUNT_JSON "
            "env var (base64-encoded serviceAccountKey.json) or place the file at: "
            + ", ".join(str(p) for p in _KEY_SEARCH_PATHS)
        )

    cred = credentials.Certificate(str(key_path))
    firebase_admin.initialize_app(cred)
    logger.info("Firebase initialised from file: %s", key_path.name)
