"""
Analyses resource — unified CRUD + detection.

Resource-oriented design:
    POST   /analyses                → Create analysis (run detection + store)
    GET    /analyses                → List user analyses (paginated)
    GET    /analyses/{id}           → Get single analysis
    GET    /analyses/{id}/attention → Get attention sub-resource
    DELETE /analyses/{id}           → Delete single analysis
    DELETE /analyses                → Bulk delete

Query parameters on POST:
    model   = standard | advanced | ensemble   (default: advanced)
    include = attention                        (optional)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse

from config import (
    ANALYSIS_TYPE_TO_MODEL,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    VALID_ANALYSIS_MODELS,
)
from dependencies import get_current_user, get_db, save_upload_to_temp
from logger import get_logger
from core.detect_deepfake import detect_deepfake, detect_deepfake_ensemble
from models.schemas import DeleteAnalysesRequest, PaginationMeta
from services.database_service import DatabaseService
from utils.links import analysis_links, collection_links

logger = get_logger(__name__)
router = APIRouter(prefix="/analyses", tags=["analyses"])


# ═══════════════════════════════════════════════════════════════════════
# POST /analyses — Create (run detection, store result)
# ═══════════════════════════════════════════════════════════════════════
@router.post("", status_code=201)
async def create_analysis(
    file: UploadFile = File(...),
    model: str = Query("advanced", description="Detection model to use"),
    include: str | None = Query(None, description="Extra data: 'attention'"),
    token_data: dict = Depends(get_current_user),
):
    """Run deepfake detection and store the result as a new analysis.

    **Model options:** ``standard``, ``advanced``, ``ensemble``

    **Include options:** ``attention`` (only with ``ensemble`` model)
    """
    if model not in VALID_ANALYSIS_MODELS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid model '{model}'. Choose from: {', '.join(VALID_ANALYSIS_MODELS)}",
        )

    user_id = token_data["uid"]

    try:
        async with save_upload_to_temp(file) as tmp_path:
            if model == "ensemble":
                result = detect_deepfake_ensemble(
                    tmp_path,
                    user_id=user_id,
                    store_results=True,
                    filename=file.filename,
                    use_transformer=True,
                )
                # Optionally surface attention data
                if include == "attention":
                    attention = (
                        result.get("detailed_results", {})
                        .get("attention_analysis", {})
                    )
                    result["attention_analysis"] = attention
            else:
                result = detect_deepfake(
                    tmp_path,
                    user_id=user_id,
                    store_results=True,
                    filename=file.filename,
                    analysis_type=model,
                )

            result["filename"] = file.filename
            model_key = ANALYSIS_TYPE_TO_MODEL.get(model)
            if model_key:
                result.setdefault("model_used", model_key)

            # HATEOAS links
            if "analysis_id" in result:
                result["_links"] = analysis_links(result["analysis_id"])

            return result

    except Exception as exc:
        logger.exception("Error creating analysis (model=%s)", model)
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process audio: {exc}"},
        )


# ═══════════════════════════════════════════════════════════════════════
# GET /analyses — List (paginated, cursor-based)
# ═══════════════════════════════════════════════════════════════════════
@router.get("")
async def list_analyses(
    per_page: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    after: str | None = Query(None, description="Cursor: last metadata ID from previous page"),
    token_data: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
):
    """Return the authenticated user's analyses, paginated."""
    try:
        data, next_cursor = db.get_user_analyses(
            token_data["uid"], per_page=per_page, after_cursor=after,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analyses: {exc}")

    has_next = next_cursor is not None

    # Add per-item links
    for item in data:
        aid = item.get("id") or item.get("analysis_id")
        if aid:
            item["_links"] = analysis_links(aid)

    return {
        "data": data,
        "pagination": PaginationMeta(
            per_page=per_page, has_next=has_next, next_cursor=next_cursor,
        ).model_dump(),
        "_links": collection_links(
            page=1, per_page=per_page, has_next=has_next, next_cursor=next_cursor,
        ),
    }


# ═══════════════════════════════════════════════════════════════════════
# GET /analyses/{id} — Read single
# ═══════════════════════════════════════════════════════════════════════
@router.get("/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    token_data: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
):
    """Retrieve a single analysis by ID (ownership check enforced)."""
    try:
        analysis = db.get_analysis(analysis_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis: {exc}")

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Ownership check
    metadata = analysis.get("metadata")
    if metadata and metadata.get("user_id") != token_data["uid"]:
        raise HTTPException(status_code=403, detail="You don't have permission to access this analysis")

    analysis["_links"] = analysis_links(analysis_id)
    return analysis


# ═══════════════════════════════════════════════════════════════════════
# GET /analyses/{id}/attention — Attention sub-resource
# ═══════════════════════════════════════════════════════════════════════
@router.get("/{analysis_id}/attention")
async def get_analysis_attention(
    analysis_id: str,
    token_data: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
):
    """Retrieve stored attention analysis data for an existing analysis."""
    try:
        analysis = db.get_analysis(analysis_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis: {exc}")

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    metadata = analysis.get("metadata")
    if metadata and metadata.get("user_id") != token_data["uid"]:
        raise HTTPException(status_code=403, detail="You don't have permission to access this analysis")

    details = analysis.get("details") or {}
    feature_scores = details.get("feature_scores", {})
    attention_data = feature_scores.get("attention_analysis", {})

    return {
        "analysis_id": analysis_id,
        "attention_analysis": attention_data,
        "_links": {
            "self": {"href": f"/v1/analyses/{analysis_id}/attention"},
            "analysis": {"href": f"/v1/analyses/{analysis_id}"},
        },
    }


# ═══════════════════════════════════════════════════════════════════════
# DELETE /analyses/{id} — Delete single
# ═══════════════════════════════════════════════════════════════════════
@router.delete("/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    token_data: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
):
    """Delete a single analysis by ID (idempotent)."""
    try:
        success = db.delete_analysis(analysis_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete analysis: {exc}")

    if not success:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {"deleted": True, "id": analysis_id}


# ═══════════════════════════════════════════════════════════════════════
# DELETE /analyses — Bulk delete
# ═══════════════════════════════════════════════════════════════════════
@router.delete("")
async def bulk_delete_analyses(
    data: DeleteAnalysesRequest,
    token_data: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
):
    """Delete multiple analyses by ID."""
    if not data.ids:
        raise HTTPException(status_code=400, detail="No analysis IDs provided")

    try:
        results = db.delete_multiple_analyses(data.ids)
        return {"deleted": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete analyses: {exc}")
