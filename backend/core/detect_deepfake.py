import os
import sys
import torch
import numpy as np
from pathlib import Path

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Updated relative imports
from models.models import DeepFakeDetector
from core.feature_extraction import extract_features

def load_model(model_path=None):
    """
    Load the pre-trained deepfake detection model
    """
    model = DeepFakeDetector()
    
    if model_path and os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    
    model.eval()
    return model

def detect_deepfake(audio_path):
    """
    Detect if an audio file is a deepfake
    
    Args:
        audio_path: Path to the audio file
        
    Returns:
        dict: Results including probability of being fake and classification
    """
    try:
        # Extract features from audio
        features = extract_features(audio_path)
        
        # Load model
        model = load_model()
        
        # Convert features to tensor
        features_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        
        # Get prediction
        with torch.no_grad():
            prediction = model(features_tensor).item()
        
        result = {
            "probability": float(prediction),
            "is_fake": prediction > 0.5,
            "confidence": float(abs(prediction - 0.5) * 2)
        }
        
        return result
    
    except Exception as e:
        return {
            "error": str(e),
            "probability": 0.0,
            "is_fake": None,
            "confidence": 0.0
        }