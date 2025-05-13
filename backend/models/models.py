import torch
import torch.nn as nn
from pydantic import BaseModel, EmailStr

# User authentication models
class UserSignUp(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    
# DeepFake detection model
class DeepFakeDetector(nn.Module):
    """
    Neural network model for deepfake audio detection.
    Takes audio features as input and outputs a probability of the audio being fake.
    """
    def __init__(self, input_features=128, hidden_dim=64):
        super(DeepFakeDetector, self).__init__()
        self.model = nn.Sequential(
            nn.Linear(input_features, hidden_dim),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 2, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        return self.model(x)