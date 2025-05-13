import os
import sys
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
from pathlib import Path

# Add the parent directory to system path to enable relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Import firebase configuration first with error handling
try:
    from services.firebase_config import initialize_firebase
    from firebase_admin import auth, firestore
    print("Firebase import successful")
except Exception as e:
    print(f"Error importing Firebase modules: {e}")
    print("Continuing without Firebase functionality...")

# Import the detect_deepfake function from the core package
from core.detect_deepfake import detect_deepfake

# Import models for user authentication
from models.models import UserSignUp, UserLogin
from fastapi.security import OAuth2PasswordBearer
import requests
import json
from typing import List

# Initialize the FastAPI app
app = FastAPI()

# Initialize Firebase with error handling
try:
    initialize_firebase()
    print("Firebase initialized successfully")
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    print("Continuing without Firebase functionality...")

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase Web API Key - get from environment variable
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")

# For development purposes, use a default key if not set in environment
if not FIREBASE_WEB_API_KEY:
    print("WARNING: FIREBASE_WEB_API_KEY environment variable is not set!")
    print("Using default key from run_server.bat for development purposes.")
    # Check if we can read the key from run_server.bat as a fallback
    try:
        run_server_path = os.path.join(os.path.dirname(__file__), "run_server.bat")
        if os.path.exists(run_server_path):
            with open(run_server_path, "r") as f:
                bat_content = f.read()
                import re
                key_match = re.search(r'set FIREBASE_WEB_API_KEY=([^\r\n]+)', bat_content)
                if key_match:
                    FIREBASE_WEB_API_KEY = key_match.group(1)
                    print(f"Found key in run_server.bat")
    except Exception as e:
        print(f"Error reading from run_server.bat: {e}")
    
    if not FIREBASE_WEB_API_KEY:
        print("WARNING: Using a dummy key. Authentication features will not work!")
        FIREBASE_WEB_API_KEY = "dummy-key-authentication-features-will-not-work"

# Configure OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@app.get("/")
async def root():
    return {"message": "Welcome to VocalGuard API"}

@app.post("/detect-deepfake/")
async def detect_deepfake_endpoint(file: UploadFile = File(...)):
    """
    Endpoint to detect if an audio file is a deepfake
    """
    # Save the uploaded file to a temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        contents = await file.read()
        with open(temp_file.name, 'wb') as f:
            f.write(contents)
            
        # Process the file with our deepfake detection logic
        result = detect_deepfake(temp_file.name)
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process audio: {str(e)}"}
        )
    finally:
        # Clean up the temporary file
        temp_file.close()
        os.unlink(temp_file.name)

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
        # Firebase Auth REST API endpoint for email/password sign-in
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
        
        # Request body
        payload = {
            "email": user_data.email,
            "password": user_data.password,
            "returnSecureToken": True
        }
        
        # Make request to Firebase Auth
        response = requests.post(url, data=json.dumps(payload))
        firebase_response = response.json()
        
        # Check for errors in the response
        if "error" in firebase_response:
            error_message = firebase_response["error"]["message"]
            print(f"Firebase auth error: {error_message}")
            if error_message == "EMAIL_NOT_FOUND" or error_message == "INVALID_PASSWORD":
                raise HTTPException(status_code=401, detail="Invalid email or password")
            else:
                raise HTTPException(status_code=400, detail=error_message)
        
        # Get user data
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
async def protected_route(token_data=Depends(verify_token)):
    return {"message": "This is a protected route", "user_id": token_data["uid"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)