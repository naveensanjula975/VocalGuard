import os
import sys
import json
import tempfile
import requests
from pathlib import Path
from typing import List
from dotenv import load_dotenv

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer

# Add the parent directory to system path to enable relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Import Firebase configuration and services
from services.firebase_config import initialize_firebase
from services.database_service import DatabaseService
from firebase_admin import auth, firestore

# Import deepfake detection functionality
from core.detect_deepfake import detect_deepfake

# Import data models
from models.models import (
    UserSignUp, UserLogin, AudioMetadata, AnalysisResult, 
    CompleteAnalysis, ResultDetails
)

# Initialize the FastAPI app
app = FastAPI()

# Initialize Firebase
initialize_firebase()

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables from .env file

# Load .env file
load_dotenv()

# Firebase Web API Key - get from environment variable
FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")

# Check if the API key is available
if not FIREBASE_WEB_API_KEY:
    print("WARNING: FIREBASE_WEB_API_KEY environment variable is not set!")
    print("Please create a .env file with your FIREBASE_WEB_API_KEY")
    raise ValueError("FIREBASE_WEB_API_KEY environment variable must be set")

# Configure OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

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

@app.get("/")
async def root():
    return {"message": "Welcome to VocalGuard API"}

@app.post("/detect-deepfake/")
async def detect_deepfake_endpoint(
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token)
):
    """
    Endpoint to detect if an audio file is a deepfake and store results
    """
    user_id = token_data["uid"]
    
    # Save the uploaded file to a temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        contents = await file.read()
        with open(temp_file.name, 'wb') as f:
            f.write(contents)
            
        # Extract audio info for logging
        filename = file.filename
        file_size = len(contents)
        
        print(f"Processing file: {filename}, size: {file_size} bytes, user: {user_id}")
        
        # Process the file with our deepfake detection logic and store results
        result = detect_deepfake(temp_file.name, user_id=user_id, store_results=True)
        
        # Add filename to result
        result["filename"] = filename
        
        return result
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
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

# Protected route example
@app.get("/protected")
async def protected_route(token_data=Depends(verify_token)):
    return {"message": "This is a protected route", "user_id": token_data["uid"]}

# Database-related endpoints
@app.get("/user/analyses")
async def get_user_analyses(token_data=Depends(verify_token)):
    """
    Get all analyses for the currently authenticated user
    """
    user_id = token_data["uid"]
    
    try:
        db_service = DatabaseService()
        analyses = db_service.get_user_analyses(user_id)
        return {"analyses": analyses}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analyses: {str(e)}")

@app.get("/analyses/{analysis_id}")
async def get_analysis_by_id(analysis_id: str, token_data=Depends(verify_token)):
    """
    Get a specific analysis by ID
    """
    try:
        db_service = DatabaseService()
        analysis = db_service.get_analysis(analysis_id)
        
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
            
        # Check if the user has permission to access this analysis
        if "metadata" in analysis and analysis["metadata"]["user_id"] != token_data["uid"]:
            raise HTTPException(status_code=403, detail="You don't have permission to access this analysis")
            
        return analysis
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve analysis: {str(e)}")

@app.post("/generate-dummy-data")
async def generate_dummy_data(token_data=Depends(verify_token)):
    """
    Generate dummy data for the current user for demonstration purposes
    """
    user_id = token_data["uid"]
    
    try:
        db_service = DatabaseService()
        analysis_ids = db_service.create_dummy_data(user_id)
        return {"message": f"Generated {len(analysis_ids)} dummy analyses", "analysis_ids": analysis_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate dummy data: {str(e)}")

@app.post("/detect-deepfake-demo")
async def detect_deepfake_demo(file: UploadFile = File(...)):
    """
    Public endpoint to detect deepfakes without authentication (for demo purposes)
    """
    # Save the uploaded file to a temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        contents = await file.read()
        with open(temp_file.name, 'wb') as f:
            f.write(contents)
            
        # Process the file with our deepfake detection logic without storing results
        result = detect_deepfake(temp_file.name, store_results=False)
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)