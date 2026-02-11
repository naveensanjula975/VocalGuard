"""
Legacy backward-compatibility routes.

These shims keep the OLD endpoint paths working while clients migrate
to the new ``/v1/…`` routes.  Each shim delegates to the same
underlying logic — no code duplication.

Remove this file once all clients have migrated.
"""

from __future__ import annotations

from fastapi import APIRouter, Body, Depends, File, UploadFile
from fastapi.responses import JSONResponse, RedirectResponse

from config import ANALYSIS_TYPE_TO_MODEL
from dependencies import get_current_user, get_db, save_upload_to_temp
from logger import get_logger
from core.detect_deepfake import detect_deepfake, detect_deepfake_ensemble
from services.database_service import DatabaseService

logger = get_logger(__name__)
router = APIRouter(tags=["legacy"], include_in_schema=False)


# ── Auth redirects (GET → 301, POST → shim) ──────────────────────────

@router.post("/signup")
async def legacy_signup():
    """Redirect POST clients to /v1/auth/signup."""
    return RedirectResponse("/v1/auth/signup", status_code=307)


@router.post("/login")
async def legacy_login():
    """Redirect POST clients to /v1/auth/login."""
    return RedirectResponse("/v1/auth/login", status_code=307)


@router.get("/protected")
async def legacy_protected():
    return RedirectResponse("/v1/auth/me", status_code=301)


# ── Detection shims (POST — must forward body) ───────────────────────

async def _legacy_detect(
    file: UploadFile,
    token_data: dict,
    analysis_type: str,
) -> dict | JSONResponse:
    try:
        async with save_upload_to_temp(file) as tmp_path:
            result = detect_deepfake(
                tmp_path,
                user_id=token_data["uid"],
                store_results=True,
                filename=file.filename,
                analysis_type=analysis_type,
            )
            result["filename"] = file.filename
            model_key = ANALYSIS_TYPE_TO_MODEL.get(analysis_type)
            if model_key:
                result.setdefault("model_used", model_key)
            return result
    except Exception as exc:
        logger.exception("Legacy detection error")
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/detect-deepfake/")
async def legacy_detect_standard(
    file: UploadFile = File(...),
    token_data: dict = Depends(get_current_user),
):
    return await _legacy_detect(file, token_data, "standard")


@router.post("/detect-deepfake-advanced/")
async def legacy_detect_advanced(
    file: UploadFile = File(...),
    token_data: dict = Depends(get_current_user),
):
    return await _legacy_detect(file, token_data, "advanced")


@router.post("/detect-deepfake-transformer/")
async def legacy_detect_transformer(
    file: UploadFile = File(...),
    token_data: dict = Depends(get_current_user),
):
    try:
        async with save_upload_to_temp(file) as tmp_path:
            result = detect_deepfake_ensemble(
                tmp_path,
                user_id=token_data["uid"],
                store_results=True,
                filename=file.filename,
                use_transformer=True,
            )
            result["filename"] = file.filename
            result.setdefault("model_used", "wav2vec2_transformer_ensemble")
            return result
    except Exception as exc:
        logger.exception("Legacy transformer detection error")
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/detect-deepfake-attention-analysis/")
async def legacy_detect_attention(
    file: UploadFile = File(...),
    token_data: dict = Depends(get_current_user),
):
    try:
        async with save_upload_to_temp(file) as tmp_path:
            result = detect_deepfake_ensemble(
                tmp_path,
                user_id=token_data["uid"],
                store_results=False,
                filename=file.filename,
                use_transformer=True,
            )
            attention = result.get("detailed_results", {}).get("attention_analysis", {})
            return {
                "filename": file.filename,
                "prediction": result.get("prediction", "error"),
                "confidence": result.get("confidence", 0.0),
                "is_fake": result.get("is_fake", None),
                "attention_analysis": attention,
                "model_used": "transformer_attention_analysis",
            }
    except Exception as exc:
        logger.exception("Legacy attention analysis error")
        return JSONResponse(status_code=500, content={"error": str(exc)})


@router.post("/detect-deepfake-demo")
async def legacy_demo(file: UploadFile = File(...)):
    try:
        async with save_upload_to_temp(file) as tmp_path:
            result = detect_deepfake(
                tmp_path, user_id=None, store_results=False,
                filename=file.filename, analysis_type="demo",
            )
            result["filename"] = file.filename
            result.setdefault("model_used", ANALYSIS_TYPE_TO_MODEL.get("demo", "demo"))
            return result
    except Exception as exc:
        logger.exception("Legacy demo detection error")
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ── Analysis read/delete shims ────────────────────────────────────────

@router.get("/user/analyses")
async def legacy_user_analyses():
    return RedirectResponse("/v1/analyses", status_code=301)


@router.get("/data/analyses")
async def legacy_data_analyses():
    return RedirectResponse("/v1/analyses", status_code=301)


@router.get("/analyses/{analysis_id}")
async def legacy_get_analysis(analysis_id: str):
    return RedirectResponse(f"/v1/analyses/{analysis_id}", status_code=301)


@router.post("/analyses/delete")
async def legacy_delete(
    data: dict = Body(...),
    token_data: dict = Depends(get_current_user),
    db: DatabaseService = Depends(get_db),
):
    """Legacy bulk delete — forwards to same DB logic."""
    ids = data.get("analysis_ids", data.get("ids", []))
    if not ids:
        return JSONResponse(status_code=400, content={"error": "No analysis IDs provided"})
    results = db.delete_multiple_analyses(ids)
    return {"deleted": results}


@router.post("/generate-dummy-data")
async def legacy_seed():
    return RedirectResponse("/v1/debug/seed", status_code=307)
