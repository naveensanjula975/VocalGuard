from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth
from models import UserSignUp, UserLogin, AudioDetectionResult
from services.firebase_config import initialize_firebase
from core.detect_deepfake import detect_deepfake
import requests
import json
import os
import tempfile
import uuid

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
    allow_origins=["http://localhost:5173"],
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

@app.post("/detect-deepfake", response_model=AudioDetectionResult)
async def detect_deepfake_endpoint(
    file: UploadFile = File(...),
    user_id: str = Form(None),
    store_results: bool = Form(False),
    threshold: float = Form(0.5)
):
    """
    Upload an audio file and detect if it's a deepfake
    """
    # Check file type
    if not file.content_type.startswith('audio/'):
        raise HTTPException(status_code=400, detail="File must be an audio file")
    
    # Create temporary file
    temp_dir = tempfile.gettempdir()
    temp_filename = f"audio_{uuid.uuid4().hex}_{file.filename}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    try:
        # Save uploaded file to temporary location
        with open(temp_path, "wb") as temp_file:
            content = await file.read()
            temp_file.write(content)
        
        # Detect deepfake
        result = detect_deepfake(
            audio_path=temp_path,
            user_id=user_id,
            store_results=store_results,
            filename=file.filename
        )
        
        # Check if there was an error
        if "error" in result:
            raise HTTPException(status_code=500, detail=result["error"])
        
        return AudioDetectionResult(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing audio file: {str(e)}")
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/")
async def root():
    return {"message": "VocalGuard API is running"}

@app.get("/health")
async def health_check():
    """
    Health check endpoint that also verifies model availability
    """
    try:
        from core.detect_deepfake import MODEL_DIR
        import os
        
        model_exists = os.path.exists(MODEL_DIR)
        config_exists = os.path.exists(os.path.join(MODEL_DIR, "config.json"))
        safetensors_exists = os.path.exists(os.path.join(MODEL_DIR, "model.safetensors"))
        
        return {
            "status": "healthy",
            "model_directory": MODEL_DIR,
            "model_available": model_exists and config_exists and safetensors_exists,
            "files": {
                "config.json": config_exists,
                "model.safetensors": safetensors_exists
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)