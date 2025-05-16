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
from services.hiya_api_service import HiyaAPIService

# Model version for tracking
MODEL_VERSION = "2.1.0"  # Updated to reflect Hiya API integration

def load_model(model_path=None):
    """
    Load the pre-trained deepfake detection model
    """
    model = DeepFakeDetector()
    
    if model_path and os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    
    model.eval()
    return model

def detect_deepfake(audio_path, user_id=None, store_results=True, use_wav2vec2=False, use_hiya_api=False):
    """
    Detect if an audio file is a deepfake and optionally store results in Firebase
    
    Args:
        audio_path: Path to the audio file
        user_id: Optional user ID to associate with the analysis
        store_results: Whether to store results in Firebase database
        use_wav2vec2: Whether to use the Wav2Vec2 model for feature extraction
        use_hiya_api: Whether to use the Hiya Audio Intelligence API for detection
        
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
        
        # If using Hiya API, call their service
        if use_hiya_api:
            # Initialize Hiya API service
            hiya_service = HiyaAPIService()
            
            # Get prediction from Hiya API
            hiya_result = hiya_service.detect_deepfake(audio_path)
            
            # Extract relevant information
            prediction = hiya_result["probability"]
            is_fake = hiya_result["is_fake"]
            confidence = hiya_result["confidence"]
            
            # Add provider information
            model_used = "hiya"
            features_used = ["hiya_audio_intelligence"]
        else:
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
            
            # Set model used
            model_used = "wav2vec2" if use_wav2vec2 else "standard"
            features_used = ["wav2vec2_embeddings"] if use_wav2vec2 else ["mfcc", "spectral_features"]        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # in milliseconds
        result = {
            "probability": float(prediction),
            "is_fake": is_fake,
            "confidence": confidence,
            "model_used": model_used
        }
        
        # Add raw Hiya API response if applicable
        if use_hiya_api and "raw_response" in hiya_result:
            result["hiya_details"] = hiya_result["raw_response"]
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
              # Store analysis result
            analysis_id = db_service.create_analysis_result(
                metadata_id=metadata_id,
                is_deepfake=is_fake,
                confidence_score=confidence,
                features_used=features_used
            )
            
            # Create feature scores dictionary
            feature_scores = {}
              
            # Handle different model sources
            if use_hiya_api:
                # For Hiya API, use the detailed scores they provide
                if isinstance(hiya_result.get("raw_response", {}).get("scores"), dict):
                    for key, value in hiya_result["raw_response"]["scores"].items():
                        feature_scores[f"hiya_{key}"] = float(value)
                
                # If no detailed scores, use the overall score
                if not feature_scores:
                    feature_scores["hiya_overall_score"] = float(prediction)
            else:
                # Calculate feature-specific scores from the extracted features
                # Split features into their respective components
                wav2vec2_features = features[:768] if use_wav2vec2 else []  # Wav2Vec2 embeddings are 768-dimensional
                mfcc_features = features[-83:-3] if use_wav2vec2 else features[:-3]  # MFCC features
                spectral_features = features[-3:] if use_wav2vec2 else features[-3:]  # Spectral features
                  # Process based on model type
                if use_wav2vec2:
                    # Get adaptive weights for this audio
                    weights = get_weights(y, sr)
                    
                    # Calculate scores with adaptive weighting
                    wav2vec2_score = np.mean(wav2vec2_features) if is_fake else 1 - np.mean(wav2vec2_features)
                    mfcc_score = np.mean(mfcc_features) if is_fake else 1 - np.mean(mfcc_features)
                    spectral_score = np.mean(spectral_features) if is_fake else 1 - np.mean(spectral_features)
                    
                    # Add scores to dictionary
                    feature_scores["wav2vec2"] = float(wav2vec2_score)
                    feature_scores["mfcc"] = float(mfcc_score)
                    feature_scores["spectral"] = float(spectral_score)
                    
                    # Apply weights to generate the final scores
                    temporal_score = float(wav2vec2_score * weights['wav2vec2'] + 
                                        mfcc_score * weights['mfcc'] + 
                                        spectral_score * weights['spectral'])
                    feature_scores["weighted_score"] = temporal_score
                else:
                    # Use standard scoring for non-Wav2Vec2 mode
                    mfcc_score = np.mean(mfcc_features) if is_fake else 1 - np.mean(mfcc_features)
                    spectral_score = np.mean(spectral_features) if is_fake else 1 - np.mean(spectral_features)
                      # Add scores to dictionary
                    feature_scores["mfcc"] = float(mfcc_score)
                    feature_scores["spectral"] = float(spectral_score)
                    
                    # Add overall score
                    feature_scores["overall_score"] = float(prediction if is_fake else 1 - prediction)
            
            # Add model information to the feature scores
            feature_scores["model_used"] = model_used
            
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