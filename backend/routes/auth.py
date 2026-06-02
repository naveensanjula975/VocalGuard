"""
Authentication routes.

Resource-oriented naming:
    POST /auth/signup   → create user resource
    POST /auth/login    → create session
    GET  /auth/me       → current user info (protected)
"""

import requests as http_requests
from fastapi import APIRouter, Depends, HTTPException

from config import FIREBASE_WEB_API_KEY
from dependencies import get_current_user
from logger import get_logger
from models.schemas import UserSignUp, UserLogin, PasswordResetRequest

from firebase_admin import auth

logger = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# POST /auth/signup
# ---------------------------------------------------------------------------
@router.post("/signup", status_code=201)
async def create_user(user_data: UserSignUp):
    """Create a new user via Firebase Auth."""
    try:
        user = auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.username,
        )
        custom_token = auth.create_custom_token(user.uid)
        return {
            "message": "User created successfully",
            "user_id": user.uid,
            "token": custom_token.decode("utf-8"),
            "username": user_data.username,
        }
    except Exception as exc:
        logger.error("Signup failed: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------
@router.post("/login")
async def create_session(user_data: UserLogin):
    """Authenticate with email/password via Firebase REST API."""
    url = (
        "https://identitytoolkit.googleapis.com/v1/"
        f"accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
    )
    payload = {
        "email": user_data.email,
        "password": user_data.password,
        "returnSecureToken": True,
    }

    response = http_requests.post(url, json=payload, timeout=10)

    if not response.ok:
        raise HTTPException(
            status_code=response.status_code,
            detail=f"FIREBASE_ERROR: Authentication failed with HTTP {response.status_code}",
        )

    firebase_data = response.json()

    if "error" in firebase_data:
        raise HTTPException(
            status_code=401,
            detail=f"FIREBASE_ERROR: {firebase_data['error']['message']}",
        )

    if "idToken" not in firebase_data or "localId" not in firebase_data:
        raise HTTPException(
            status_code=500,
            detail="Invalid response from authentication service",
        )

    # Enrich with display_name from Admin SDK
    try:
        user = auth.get_user_by_email(user_data.email)
        return {
            "message": "Login successful",
            "user_id": user.uid,
            "token": firebase_data["idToken"],
            "username": user.display_name or user.email.split("@")[0],
            "email": user.email,
        }
    except Exception as exc:
        logger.warning("Could not fetch user record: %s", exc)
        return {
            "message": "Login successful",
            "user_id": firebase_data["localId"],
            "token": firebase_data["idToken"],
            "username": user_data.email.split("@")[0],
            "email": user_data.email,
        }


# ---------------------------------------------------------------------------
# POST /auth/forgot-password
# ---------------------------------------------------------------------------
@router.post("/forgot-password", status_code=200)
async def forgot_password(body: PasswordResetRequest):
    """Send a password-reset email via Firebase Auth (free, no SMTP config needed)."""
    url = (
        "https://identitytoolkit.googleapis.com/v1/"
        f"accounts:sendOobCode?key={FIREBASE_WEB_API_KEY}"
    )
    payload = {"requestType": "PASSWORD_RESET", "email": body.email}

    response = http_requests.post(url, json=payload, timeout=10)
    data = response.json()

    if "error" in data:
        error_msg = data["error"].get("message", "")
        # EMAIL_NOT_FOUND → still return 200 to avoid user enumeration
        if error_msg == "EMAIL_NOT_FOUND":
            return {"message": "If that email is registered, a reset link has been sent."}
        logger.warning("Firebase forgot-password error: %s", error_msg)
        raise HTTPException(status_code=400, detail="Failed to send reset email. Please try again.")

    return {"message": "If that email is registered, a reset link has been sent."}


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------
@router.get("/me")
async def get_current_user_info(token_data: dict = Depends(get_current_user)):
    """Return the authenticated user's identity (replaces old /protected)."""
    return {"user_id": token_data["uid"]}
