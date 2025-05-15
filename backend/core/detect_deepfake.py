import os
import sys
import torch
import numpy as np
import librosa
import time
from pathlib import Path
import uuid

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Updated relative imports
from models.models import DeepFakeDetector
from core.feature_extraction import extract_features
from core.feature_weighting import get_weights
from services.database_service import DatabaseService

# Model version for tracking
MODEL_VERSION = "2.0.0"  # Updated to reflect Wav2Vec2 integration

def load_model(model_path=None):
    """
    Load the pre-trained deepfake detection model
    """
    model = DeepFakeDetector()
    
    if model_path and os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    
    model.eval()
    return model

def detect_deepfake(audio_path, user_id=None, store_results=True, use_wav2vec2=False):
    """
    Detect if an audio file is a deepfake and optionally store results in Firebase
    
    Args:
        audio_path: Path to the audio file
        user_id: Optional user ID to associate with the analysis
        store_results: Whether to store results in Firebase database
        use_wav2vec2: Whether to use the Wav2Vec2 model for feature extraction
        
    Returns:
        dict: Results including probability of being fake, classification, and analysis IDs
    """
    start_time = time.time()
    try:
        # Get audio information
        y, sr = librosa.load(audio_path, sr=None)
        duration = librosa.get_duration(y=y, sr=sr)
        file_size = os.path.getsize(audio_path)
        filename = os.path.basename(audio_path)
        
        # Extract features from audio using Wav2Vec2 if requested, otherwise use traditional features
        features = extract_features(audio_path, use_wav2vec2=use_wav2vec2)
        
        # Load model
        model = load_model()
        
        # Convert features to tensor
        features_tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        
        # Get prediction
        with torch.no_grad():
            prediction = model(features_tensor).item()
        
        is_fake = prediction > 0.5
        confidence = float(abs(prediction - 0.5) * 2)
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # in milliseconds
        result = {
            "probability": float(prediction),
            "is_fake": is_fake,
            "confidence": confidence
        }
        
        # Store results in Firebase if requested and user_id is provided
        if store_results and user_id:
            db_service = DatabaseService()
            
            # Store audio metadata with more details about the audio file
            channels = 1  # Default for librosa.load
            bit_depth = "16 bits"  # Typical for audio files
            
            try:
                # Try to get more audio info if available
                channels = y.shape[1] if len(y.shape) > 1 else 1
            except:
                pass
                
            # Get bit depth based on file extension
            if filename.lower().endswith('.wav'):
                bit_depth = "16 bits"  # Typical for WAV
            elif filename.lower().endswith('.flac'):
                bit_depth = "24 bits"  # Typical for FLAC
            
            metadata_id = db_service.create_audio_metadata(
                user_id=user_id,
                filename=filename,
                file_size=file_size,
                duration=duration,
                sample_rate=sr,
                channels=channels,
                bit_depth=bit_depth
            )
              # Feature names used in analysis
            features_used = ["wav2vec2", "mfcc", "spectral_centroid", "spectral_rolloff", "zero_crossing_rate"]
            
            # Store analysis result
            analysis_id = db_service.create_analysis_result(
                metadata_id=metadata_id,
                is_deepfake=is_fake,
                confidence_score=confidence,
                features_used=features_used
            )
              # Calculate feature-specific scores from the extracted features
            # Split features into their respective components
            wav2vec2_features = features[:768]  # Wav2Vec2 embeddings are 768-dimensional
            mfcc_features = features[768:768+80]  # 80 values for MFCC mean and variance
            spectral_features = features[768+80:]  # Remaining features are spectral
              # Get adaptive weights if using Wav2Vec2
            if use_wav2vec2:
                # Get adaptive weights for this audio
                weights = get_weights(y, sr)
                
                # Calculate scores with adaptive weighting
                wav2vec2_score = np.mean(wav2vec2_features) if is_fake else 1 - np.mean(wav2vec2_features)
                mfcc_score = np.mean(mfcc_features) if is_fake else 1 - np.mean(mfcc_features)
                spectral_score = np.mean(spectral_features) if is_fake else 1 - np.mean(spectral_features)
                
                # Apply weights to generate the final scores
                temporal_score = float(wav2vec2_score * weights['wav2vec2'] + 
                                      mfcc_score * weights['mfcc'] + 
                                      spectral_score * weights['spectral'])
            else:
                # Use standard scoring for non-Wav2Vec2 mode
                wav2vec2_score = np.mean(wav2vec2_features) if is_fake else 1 - np.mean(wav2vec2_features)
                mfcc_score = np.mean(mfcc_features) if is_fake else 1 - np.mean(mfcc_features)
                spectral_score = np.mean(spectral_features) if is_fake else 1 - np.mean(spectral_features)
                temporal_score = float(wav2vec2_score * 0.8 + mfcc_score * 0.2)
            
            feature_scores = {
                "wav2vec2_score": float(wav2vec2_score),
                "mfcc_score": float(mfcc_score),
                "spectral_score": float(spectral_score),
                "temporal_score": temporal_score,
                "overall_score": float(prediction if is_fake else 1 - prediction)
            }
            
            # Store detailed results
            details_id = db_service.create_result_details(
                analysis_id=analysis_id,
                feature_scores=feature_scores,
                model_version=MODEL_VERSION,
                processing_time=processing_time
            )
            
            # Add IDs to the result
            result.update({
                "metadata_id": metadata_id,
                "analysis_id": analysis_id,
                "details_id": details_id
            })
        
        return result
    
    except Exception as e:
        return {
            "error": str(e),
            "probability": 0.0,
            "is_fake": None,
            "confidence": 0.0
        }