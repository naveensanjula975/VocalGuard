from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth
from models import UserSignUp, UserLogin
import firebase_config
import requests
import json
import os

app = FastAPI()

# Firebase Web API Key
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
if not FIREBASE_WEB_API_KEY:
    raise RuntimeError("FIREBASE_WEB_API_KEY environment variable is not set")

# Configure OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/signup")
async def signup(user_data: UserSignUp):
    try:
        # Create user in Firebase
        user = auth.create_user(
            email=user_data.email,
            password=user_data.password,
            display_name=user_data.username
        )
        
        # Create custom token
        custom_token = auth.create_custom_token(user.uid)
        
        return {
            "message": "User created successfully",
            "user_id": user.uid,
            "token": custom_token.decode('utf-8'),
            "username": user_data.username
        }
    except Exception as e:
        print(f"Signup error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
async def login(user_data: UserLogin):
    try:
        # Verify email/password using Firebase Auth REST API
        auth_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
        
        payload = {
            "email": user_data.email,
            "password": user_data.password,
            "returnSecureToken": True
        }
        
        response = requests.post(auth_url, json=payload)
        
        if response.status_code != 200:
            error_message = response.json().get("error", {}).get("message", "Invalid credentials")
            raise HTTPException(status_code=401, detail=error_message)
            
        firebase_response = response.json()
        
        # Get additional user info from Firebase Admin SDK
        user = auth.get_user_by_email(user_data.email)
        
        return {
            "message": "Login successful",
            "user_id": user.uid,
            "token": firebase_response["idToken"],  # Use the ID token from Firebase Auth
            "username": user.display_name,
            "email": user.email
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

# Verify token middleware
async def verify_token(authorization: str = Depends(oauth2_scheme)):
    try:
        token = authorization.replace("Bearer ", "")
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )

# Protected route example
@app.get("/protected")
async def protected_route(token_data: dict = Depends(verify_token)):
    return {"message": "This is a protected route", "user_id": token_data["uid"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)