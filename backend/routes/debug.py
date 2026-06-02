"""
Debug / development routes — should be disabled in production.

    POST /debug/seed → generate dummy data
"""

from fastapi import APIRouter, Depends, HTTPException

from dependencies import get_current_user, get_db
from logger import get_logger
from services.database_service import DatabaseService

logger = get_logger(__name__)
router = APIRouter(prefix="/debug", tags=["debug"])


@router.post("/seed")
async def seed_data(
    token_data: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
):
    """Generate sample analysis data for demonstration/testing."""
    try:
        analysis_ids = db.create_dummy_data(token_data["uid"])
        return {
            "message": f"Generated {len(analysis_ids)} dummy analyses",
            "analysis_ids": analysis_ids,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate dummy data: {exc}",
        )
