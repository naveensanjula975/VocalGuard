"""
FastAPI dependency functions — injectable via `Depends()`.

This module centralises cross-cutting concerns (auth, DB access,
temp-file lifecycle) so that route handlers stay thin and focused
on HTTP semantics.
"""

from __future__ import annotations

import os
import tempfile
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth

from logger import get_logger
from services.database_service import DatabaseService
from config import ALLOWED_AUDIO_TYPES, ALLOWED_AUDIO_EXTENSIONS, MAX_AUDIO_SIZE_BYTES

logger = get_logger(__name__)

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Verify Firebase ID token and return decoded claims."""
    clean_token = token.replace("Bearer ", "")
    try:
        decoded = auth.verify_id_token(clean_token)
        return decoded
    except Exception as exc:
        logger.warning("Token verification failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------
def get_db() -> DatabaseService:
    """Return a ``DatabaseService`` instance.

    Using a factory function (instead of instantiating inside every
    handler) makes it trivial to swap in a mock for tests.
    """
    return DatabaseService()


# ---------------------------------------------------------------------------
# Temporary file helper
# ---------------------------------------------------------------------------
@asynccontextmanager
async def save_upload_to_temp(file: UploadFile) -> AsyncGenerator[str, None]:
    """Read *file* into a temp file and yield its path.

    The temp file is guaranteed to be cleaned up on exit — no more
    duplicated try/finally blocks in every detection endpoint.
    """
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or "")[1])
    try:
        contents = await file.read()
        tmp.write(contents)
        tmp.flush()
        tmp.close()
        yield tmp.name
    finally:
        try:
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)
        except OSError:
            pass

async def validate_audio_file(file: UploadFile = File(...)) -> UploadFile:
    """Validate uploaded audio file type, extension, and size."""
    # 1. Check file extension
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_AUDIO_EXTENSIONS)}"
        )
    
    # 2. Check content type
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=415, 
            detail=f"Unsupported content type '{file.content_type}'."
        )

    # 3. Check file size
    if file.size is not None and file.size > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=413, 
            detail=f"File too large. Maximum size is {MAX_AUDIO_SIZE_BYTES // (1024 * 1024)}MB."
        )
        
    return file
