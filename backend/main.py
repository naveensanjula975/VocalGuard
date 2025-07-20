import os
import sys
import json
import tempfile
import requests
from pathlib import Path
from typing import List
from dotenv import load_dotenv

from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Form, Body
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
from core.detect_deepfake import detect_deepfake, detect_deepfake_ensemble

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
    print("Please copy .env.example to .env and update it with your Firebase credentials")
    print("You can find these credentials in your Firebase console")
    raise ValueError("FIREBASE_WEB_API_KEY environment variable must be set")

# Configure OAuth2
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# Verify token middleware
async def verify_token(authorization: str = Depends(oauth2_scheme)):
    try:
        token = authorization.replace("Bearer ", "")
          # Verify token with Firebase
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            # Log error but don't expose details in production
            print(f"Firebase token verification error: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail=f"FIREBASE_ERROR: Invalid token: {str(e)}"
            )
    except Exception as e:
        print(f"General token verification error: {str(e)}")
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
              # Extract audio info
        filename = file.filename
        file_size = len(contents)
          # Process the file with our deepfake detection logic and store results
        result = detect_deepfake(temp_file.name, user_id=user_id, store_results=True, filename=filename, analysis_type="standard")
        
        # Ensure filename is in the result
        result["filename"] = filename
        
        return result
    except Exception as e:
        print(f"Error processing audio: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process audio: {str(e)}"}
        )
    finally:
        # Clean up the temporary file safely
        try:
            if not temp_file.closed:
                temp_file.close()
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        except (OSError, FileNotFoundError):
            # File already deleted or doesn't exist
            pass
        
@app.post("/detect-deepfake-advanced/")
async def detect_deepfake_advanced_endpoint(
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token)
):
    """
    Advanced endpoint using Wav2Vec2 model to detect if an audio file is a deepfake
    """
    user_id = token_data["uid"]
    
    # Save the uploaded file to a temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        contents = await file.read()
        with open(temp_file.name, 'wb') as f:
            f.write(contents)
              # Extract audio info
        filename = file.filename
        file_size = len(contents)
          # Process the file with our deepfake detection logic with Wav2Vec2 and store results
        result = detect_deepfake(temp_file.name, user_id=user_id, store_results=True, filename=filename, analysis_type="advanced")
          # Add filename and model info to result
        result["filename"] = filename
        result["model_used"] = result.get("model_used", "wav2vec2-xlsr-deepfake")
        
        return result
    except Exception as e:
        print(f"Error processing audio with Wav2Vec2: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process audio with Wav2Vec2: {str(e)}"}
        )
    finally:
        # Clean up the temporary file safely
        try:
            if not temp_file.closed:
                temp_file.close()
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        except (OSError, FileNotFoundError):
            # File already deleted or doesn't exist
            pass

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
        response = requests.post(url, json=payload)
        
        # Check if the response was successful
        if not response.ok:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"FIREBASE_ERROR: Authentication failed with HTTP {response.status_code}"
            )
        
        firebase_response = response.json()
          # Check for errors in the Firebase response
        if "error" in firebase_response:
            error_message = firebase_response["error"]["message"]
            raise HTTPException(
                status_code=401,
                detail=f"FIREBASE_ERROR: {error_message}"
            )
        
        # Verify the required fields are in the response
        if "idToken" not in firebase_response or "localId" not in firebase_response:
            raise HTTPException(
                status_code=500,
                detail="Invalid response from authentication service"
            )
        
        try:            # Get user data from Firebase Admin SDK
            user = auth.get_user_by_email(user_data.email)
            
            return {
                "message": "Login successful",
                "user_id": user.uid,
                "token": firebase_response["idToken"],
                "username": user.display_name or user.email.split('@')[0],  # Fallback to email prefix if no display name
                "email": user.email
            }
        except Exception as user_fetch_error:
            print(f"Error fetching user data: {user_fetch_error}")
            # Even if we can't get the user data, we can still return the token
            return {
                "message": "Login successful",
                "user_id": firebase_response["localId"],
                "token": firebase_response["idToken"],
                "username": user_data.email.split('@')[0],  # Use email prefix as username
                "email": user_data.email
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

@app.get("/data/analyses")
async def get_data_analyses(token_data=Depends(verify_token)):
    """
    Get all analyses for the currently authenticated user (alternative endpoint)
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
        result = detect_deepfake(temp_file.name, store_results=False, analysis_type="demo")
        return result
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process audio: {str(e)}"}
        )
    finally:
        # Clean up the temporary file safely
        try:
            if not temp_file.closed:
                temp_file.close()
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        except (OSError, FileNotFoundError):
            # File already deleted or doesn't exist
            pass

@app.post("/analyses/delete")
async def delete_analyses(
    data: dict = Body(...),
    token_data=Depends(verify_token)
):
    """
    Delete multiple analyses by their IDs for the authenticated user.
    """
    user_id = token_data["uid"]
    analysis_ids = data.get("analysis_ids", [])
    if not isinstance(analysis_ids, list) or not analysis_ids:
        raise HTTPException(status_code=400, detail="No analysis IDs provided")
    try:
        db_service = DatabaseService()
        # Optionally, check ownership of each analysis before deletion
        # For now, rely on db_service to handle permissions if needed
        results = db_service.delete_multiple_analyses(analysis_ids)
        return {"deleted": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete analyses: {str(e)}")

@app.post("/detect-deepfake-transformer/")
async def detect_deepfake_transformer_endpoint(
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token)
):
    """
    Transformer ensemble endpoint using both Wav2Vec2 and attention-based Transformer models
    """
    user_id = token_data["uid"]
    
    # Save the uploaded file to a temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        contents = await file.read()
        with open(temp_file.name, 'wb') as f:
            f.write(contents)
        
        filename = file.filename
        file_size = len(contents)
        
        # Process the file with ensemble detection (Wav2Vec2 + Transformer)
        result = detect_deepfake_ensemble(
            temp_file.name, 
            user_id=user_id, 
            store_results=True, 
            filename=filename,
            use_transformer=True
        )
        
        # Add filename and model info to result
        result["filename"] = filename
        result["model_used"] = result.get("model_used", "wav2vec2_transformer_ensemble")
        
        return result
    except Exception as e:
        print(f"Error processing audio with Transformer ensemble: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process audio with Transformer ensemble: {str(e)}"}
        )
    finally:
        # Clean up the temporary file safely
        try:
            if not temp_file.closed:
                temp_file.close()
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        except (OSError, FileNotFoundError):
            # File already deleted or doesn't exist
            pass

@app.post("/detect-deepfake-attention-analysis/")
async def detect_deepfake_attention_analysis_endpoint(
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_token)
):
    """
    Get detailed attention analysis for deepfake detection visualization
    """
    user_id = token_data["uid"]
    
    # Save the uploaded file to a temporary location
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        contents = await file.read()
        with open(temp_file.name, 'wb') as f:
            f.write(contents)
        
        filename = file.filename
        
        # Get ensemble results with detailed attention analysis
        result = detect_deepfake_ensemble(
            temp_file.name, 
            user_id=user_id, 
            store_results=False,  # Don't store for analysis-only requests
            filename=filename,
            use_transformer=True
        )
        
        # Extract attention analysis for visualization
        attention_analysis = result.get("detailed_results", {}).get("attention_analysis", {})
        
        response = {
            "filename": filename,
            "prediction": result.get("prediction", "error"),
            "confidence": result.get("confidence", 0.0),
            "is_fake": result.get("is_fake", None),
            "attention_analysis": attention_analysis,
            "model_used": "transformer_attention_analysis"
        }
        
        return response
    except Exception as e:
        print(f"Error processing attention analysis: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to process attention analysis: {str(e)}"}
        )
    finally:
        # Clean up the temporary file safely
        try:
            if not temp_file.closed:
                temp_file.close()
            if os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
        except (OSError, FileNotFoundError):
            # File already deleted or doesn't exist
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)