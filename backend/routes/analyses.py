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

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, Request, BackgroundTasks
from fastapi.responses import JSONResponse
import uuid
import os
import tempfile
import asyncio
import json
import urllib.request

from config import (
    ANALYSIS_TYPE_TO_MODEL,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    VALID_ANALYSIS_MODELS,
)
from dependencies import get_current_user, get_db, save_upload_to_temp, validate_audio_file
from logger import get_logger
from core.detect_deepfake import detect_deepfake, detect_deepfake_ensemble
from models.schemas import DeleteAnalysesRequest, PaginationMeta
from services.database_service import DatabaseService
from utils.links import analysis_links, collection_links
from rate_limiter import limiter

logger = get_logger(__name__)
router = APIRouter(prefix="/analyses", tags=["analyses"])

# ---------------------------------------------------------------------------
# Background Job Status Tracking (In-Memory for Demo)
# ---------------------------------------------------------------------------
_JOBS: dict[str, dict] = {}

def _run_analysis_job(job_id: str, tmp_path: str, model: str, include: str | None, user_id: str, filename: str, webhook_url: str | None = None):
    """Execute analysis synchronously in a background thread and optionally send a webhook."""
    logger.info("Starting background job %s", job_id)
    try:
        if model == "ensemble":
            result = detect_deepfake_ensemble(
                tmp_path, user_id=user_id, store_results=True, filename=filename, use_transformer=True
            )
            if include == "attention":
                result["attention_analysis"] = result.get("detailed_results", {}).get("attention_analysis", {})
        else:
            result = detect_deepfake(
                tmp_path, user_id=user_id, store_results=True, filename=filename, analysis_type=model
            )

        result["filename"] = filename
        model_key = ANALYSIS_TYPE_TO_MODEL.get(model)
        if model_key:
            result.setdefault("model_used", model_key)
        if "analysis_id" in result:
            result["_links"] = analysis_links(result["analysis_id"])

        _JOBS[job_id] = {"status": "completed", "result": result}
        logger.info("Completed background job %s", job_id)

        # -------------------------------------------------------------------
        # Webhook Notification firing
        # -------------------------------------------------------------------
        if webhook_url:
            try:
                logger.info("Sending webhook notification for job %s to %s", job_id, webhook_url)
                payload = json.dumps({"job_id": job_id, "status": "completed", "result": result}).encode("utf-8")
                req = urllib.request.Request(
                    webhook_url,
                    data=payload,
                    headers={"Content-Type": "application/json", "User-Agent": "VocalGuard-Webhook/1.0"}
                )
                with urllib.request.urlopen(req, timeout=10) as response:
                    logger.info("Webhook success: %s", response.status)
            except Exception as webhook_err:
                logger.error("Failed to send webhook for job %s: %s", job_id, webhook_err)

    except Exception as exc:
        logger.exception("Job %s failed", job_id)
        _JOBS[job_id] = {"status": "failed", "error": str(exc)}
    finally:
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except OSError:
            pass

# ═══════════════════════════════════════════════════════════════════════
# GET /analyses/jobs/{job_id} — Poll Job Status
# ═══════════════════════════════════════════════════════════════════════
@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, token_data: dict = Depends(get_current_user)):
    """Poll for the status of an asynchronous background job."""
    if job_id not in _JOBS:
        raise HTTPException(status_code=404, detail="Job not found")
    return _JOBS[job_id]


# ═══════════════════════════════════════════════════════════════════════
# POST /analyses — Create (run detection, store result)
# ═══════════════════════════════════════════════════════════════════════
@router.post("", status_code=201)
@limiter.limit("5/minute")
async def create_analysis(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = Depends(validate_audio_file),
    model: str = Query("advanced", description="Detection model to use"),
    include: str | None = Query(None, description="Extra data: 'attention'"),
    async_mode: bool = Query(False, description="Run in background and return job_id for polling"),
    webhook_url: str | None = Query(None, description="Optional callback URL for async notification. Ignored if async_mode is false."),
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
    
    if async_mode:
        job_id = str(uuid.uuid4())
        _JOBS[job_id] = {"status": "processing"}
        
        # Save temp file explicitly
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or "")[1])
        contents = await file.read()
        tmp.write(contents)
        tmp.close()
        
        background_tasks.add_task(
            _run_analysis_job, job_id, tmp.name, model, include, user_id, file.filename, webhook_url
        )
        return {"job_id": job_id, "status": "processing", "_links": {"status": f"/api/v1/analyses/jobs/{job_id}"}}
    
    # Synchronous flow

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
