from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any

class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AudioDetectionResult(BaseModel):
    probability: float
    is_fake: bool
    confidence: float
    label: str
    model_used: str
    processing_time: float
    probabilities: Dict[str, float]
    filename: str
    metadata_id: Optional[str] = None
    analysis_id: Optional[str] = None
    details_id: Optional[str] = None

class AudioDetectionRequest(BaseModel):
    user_id: Optional[str] = None
    store_results: bool = True
    threshold: float = 0.5
    
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
