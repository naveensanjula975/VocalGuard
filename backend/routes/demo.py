"""
Public demo route — no authentication required, no result storage.

    POST /demo/analyses → ephemeral detection result
"""

from fastapi import APIRouter, File, UploadFile
from fastapi.responses import JSONResponse

from config import ANALYSIS_TYPE_TO_MODEL
from dependencies import save_upload_to_temp
from logger import get_logger
from core.detect_deepfake import detect_deepfake

logger = get_logger(__name__)
router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/analyses")
async def demo_analysis(file: UploadFile = File(...)):
    """Run detection without authentication or storage (demo/trial)."""
    try:
        async with save_upload_to_temp(file) as tmp_path:
            result = detect_deepfake(
                tmp_path,
                user_id=None,
                store_results=False,
                filename=file.filename,
                analysis_type="demo",
            )
            result["filename"] = file.filename
            result.setdefault("model_used", ANALYSIS_TYPE_TO_MODEL.get("demo", "demo"))
            return result
    except Exception as exc:
        logger.exception("Error in demo analysis")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process audio: {exc}"},
        )
