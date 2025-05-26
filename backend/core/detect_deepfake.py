import os
import sys
import torch
import torchaudio
import numpy as np
import librosa
import time
import soundfile as sf
import traceback
from pathlib import Path
from transformers import Wav2Vec2FeatureExtractor, AutoModelForAudioClassification

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Updated relative imports
from models.models import DeepFakeDetector
from services.database_service import DatabaseService

# Model version for tracking
MODEL_VERSION = "1.0.0"  

# Path to the safetensors model directory (deepfake_audio_model subfolder)
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "deepfake_audio_model")

class DeepfakeAudioDetector:
    def __init__(self, model_path):
        """
        Initialize the deepfake audio detector with a local model
        
        Args:
            model_path (str): Path to the directory containing the saved model
        """
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}")
        
        # Load feature extractor and model from local directory
        self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_path)
        self.model = AutoModelForAudioClassification.from_pretrained(model_path, use_safetensors=True).to(self.device)
        
        # Get class labels if available
        self.id2label = self.model.config.id2label if hasattr(self.model.config, "id2label") else {0: "real", 1: "fake"}
        print(f"Loaded model with labels: {self.id2label}")
    
    def preprocess_audio(self, audio_path):
        """
        Preprocess audio file to match model requirements
        
        Args:
            audio_path (str): Path to the audio file
        
        Returns:
            torch.Tensor: Processed audio input tensor
        """
        # Load audio with librosa (handles more formats)
        try:
            # Option 1: Using librosa
            waveform, sample_rate = librosa.load(audio_path, sr=16000)  # 16kHz is common for wav2vec2
            
            # Convert to float32 if not already
            waveform = waveform.astype(np.float32)
            
        except Exception as e:
            print(f"Librosa loading failed: {e}, trying torchaudio...")
            # Option 2: Using torchaudio as fallback
            waveform, sample_rate = torchaudio.load(audio_path)
            
            # Convert to mono if stereo
            if waveform.shape[0] > 1:
                waveform = torch.mean(waveform, dim=0)
            
            # Convert to numpy for feature extractor
            waveform = waveform.numpy()
            
            # Resample if needed
            if sample_rate != 16000:
                waveform = librosa.resample(waveform, orig_sr=sample_rate, target_sr=16000)
        
        # Process through feature extractor
        inputs = self.feature_extractor(
            waveform, 
            sampling_rate=16000, 
            return_tensors="pt"
        )
        
        return inputs
    
    def detect(self, audio_path, threshold=0.5):
        """
        Detect if an audio file is fake or real
        
        Args:
            audio_path (str): Path to the audio file
            threshold (float): Confidence threshold for classification
            
        Returns:
            dict: Detection results including prediction, confidence scores, and label
        """
        # Preprocess audio
        inputs = self.preprocess_audio(audio_path)
        
        # Move inputs to device
        inputs = {key: val.to(self.device) for key, val in inputs.items()}
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(**inputs)
        
        # Get predictions
        logits = outputs.logits
        probabilities = torch.nn.functional.softmax(logits, dim=1)
        predictions = torch.argmax(probabilities, dim=1)
        
        # Convert to numpy
        pred_idx = predictions[0].cpu().item()
        confidence = probabilities[0][pred_idx].cpu().item()
        all_probs = probabilities[0].cpu().numpy()
        
        # Return results
        result = {
            "prediction": self.id2label[pred_idx],
            "confidence": confidence,
            "label_index": pred_idx,
            "probabilities": {self.id2label[i]: float(prob) for i, prob in enumerate(all_probs)},
            "is_fake": pred_idx == 1 if "fake" in self.id2label.values() else (confidence > threshold)
        }
        
        return result
def load_model(model_path=None):
    """
    Load the pre-trained deepfake detection model
    """
    model = DeepFakeDetector()
    
    if model_path and os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=torch.device('cpu')))
    
    model.eval()
    return model

def detect_deepfake(audio_path, user_id=None, store_results=True, filename=None):
    """
    Detect if an audio file is a deepfake using the Wav2Vec2 model in /models/deepfake_audio_model/.
    
    Args:
        audio_path: Path to the audio file
        user_id: Optional user ID to associate with the analysis
        store_results: Whether to store results in Firebase database
        filename: Original filename of the uploaded audio
        
    Returns:
        dict: Results including probability of being fake, classification, and analysis IDs
    """
    start_time = time.time()
    try:
        # Initialize the detector with the model path
        detector = DeepfakeAudioDetector(MODEL_DIR)
        
        # Detect if audio is fake
        detection_result = detector.detect(audio_path)
        
        # Convert the detailed result to our API format
        processing_time = (time.time() - start_time) * 1000  # ms
        result = {
            "probability": detection_result["confidence"],
            "is_fake": detection_result["is_fake"],
            "confidence": detection_result["confidence"],
            "label": detection_result["prediction"],
            "model_used": "wav2vec2-xlsr-deepfake",
            "processing_time": processing_time,
            "probabilities": detection_result["probabilities"],
            "filename": filename or os.path.basename(audio_path)
        }
        
        # Store results in Firebase if requested
        if store_results and user_id:
            try:
                db_service = DatabaseService()
                
                # Get audio metadata
                with open(audio_path, 'rb') as f:
                    file_size = len(f.read())
                
                # Get audio duration and sample rate
                try:
                    audio_data, sample_rate = librosa.load(audio_path, sr=None)
                    duration = librosa.get_duration(y=audio_data, sr=sample_rate)
                except Exception as e:
                    print(f"Error getting audio metadata: {e}")
                    # Fallback values
                    duration = 0
                    sample_rate = 16000
                
                # Use provided filename or extract from path
                if not filename:
                    filename = os.path.basename(audio_path)
                
                # Save metadata in database
                metadata_id = db_service.create_audio_metadata(
                    user_id=user_id,
                    filename=filename,
                    file_size=file_size,
                    duration=duration,
                    sample_rate=sample_rate
                )
                
                # Create analysis result
                features_used = ["wav2vec2-xlsr"]
                analysis_id = db_service.create_analysis_result(
                    metadata_id=metadata_id,
                    is_deepfake=result["is_fake"],
                    confidence_score=result["confidence"],
                    features_used=features_used
                )
                
                # Create detailed results
                feature_scores = {
                    "probabilities": detection_result["probabilities"]
                }
                details_id = db_service.create_result_details(
                    analysis_id=analysis_id,
                    feature_scores=feature_scores,
                    model_version=MODEL_VERSION,
                    processing_time=processing_time
                )
                
                # Add IDs to the result
                result["metadata_id"] = metadata_id
                result["analysis_id"] = analysis_id
                result["details_id"] = details_id
                
            except Exception as db_error:
                print(f"Error storing results in database: {db_error}")
                # Continue even if database storage fails
        
        return result
    except Exception as e:
        print(f"Error in detect_deepfake: {str(e)}")
        print(traceback.format_exc())
        return {
            "error": str(e),
            "probability": 0.0,
            "is_fake": None,
            "confidence": 0.0,
            "label": "error",
            "model_used": "wav2vec2-xlsr-deepfake",
            "processing_time": 0,
            "filename": filename or os.path.basename(audio_path) if audio_path else "unknown"
        }