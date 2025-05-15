import torch
import torch.nn as nn
from pydantic import BaseModel, EmailStr, Field
from typing import List, Dict, Optional, Union
import datetime

# User authentication models
class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Audio Metadata models
class AudioMetadataCreate(BaseModel):
    filename: str
    file_size: int
    duration: float
    sample_rate: int

class AudioMetadata(AudioMetadataCreate):
    id: str
    user_id: str
    upload_timestamp: str

# Analysis models
class AnalysisResultCreate(BaseModel):
    metadata_id: str
    is_deepfake: bool
    confidence_score: float
    features_used: List[str]

class AnalysisResult(AnalysisResultCreate):
    id: str
    analysis_timestamp: str

# Result Details models
class ResultDetailsCreate(BaseModel):
    analysis_id: str
    feature_scores: Dict[str, float]
    model_version: str
    processing_time: float

class ResultDetails(ResultDetailsCreate):
    id: str
    created_at: str

# Combined model for API responses
class CompleteAnalysis(BaseModel):
    id: str
    metadata_id: str
    is_deepfake: bool
    confidence_score: float
    features_used: List[str]
    analysis_timestamp: str
    metadata: Optional[AudioMetadata] = None
    details: Optional[ResultDetails] = None
    
# DeepFake detection model
class DeepFakeDetector(nn.Module):
    """
    Neural network model for deepfake audio detection.
    Takes audio features as input and outputs a probability of the audio being fake.
    Supports both traditional features and Wav2Vec2 features.
    """
    def __init__(self, input_features=851, hidden_dim=128):
        """
        Initialize the DeepFake detector model.
        
        Args:
            input_features: Size of input features (default: 851)
                - 768 (Wav2Vec2) + 80 (MFCC mean & var) + 3 (spectral features)
            hidden_dim: Size of hidden layers (default: 128)
        """
        super(DeepFakeDetector, self).__init__()
        self.model = nn.Sequential(
            nn.Linear(input_features, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim // 2, hidden_dim // 4),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 4),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 4, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        return self.model(x)