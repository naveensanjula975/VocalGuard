"""
Hiya Audio Intelligence API Service for VocalGuard.
This service handles communication with Hiya's API for deepfake detection.
"""
import os
import requests
import json
from pathlib import Path
import tempfile

class HiyaAPIService:
    """
    Service for interacting with the Hiya Audio Intelligence API
    """
    def __init__(self, api_key=None):
        """
        Initialize the Hiya API Service.
        
        Args:
            api_key: Hiya API key (if not provided, will use environment variable)
        """
        # Use provided API key or get from environment variable
        self.api_key = api_key or os.environ.get("HIYA_API_KEY", "q5pjgAYaZdmTLzeWcLDVOMtTGKFlfFKZLPaaEcSt")
        self.base_url = "https://api.hiya.com/audio-intelligence/v1"
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "multipart/form-data"
        }
        
    def detect_deepfake(self, audio_file_path):
        """
        Detect if an audio file is a deepfake using Hiya's Audio Intelligence API.
        
        Args:
            audio_file_path: Path to the audio file
            
        Returns:
            dict: Results from Hiya's API including probability, classification, and detailed scores
        """
        try:
            # API endpoint for deepfake detection
            endpoint = f"{self.base_url}/deepfake-detection"
            
            # Prepare the file for upload
            files = {
                'audio': (os.path.basename(audio_file_path), open(audio_file_path, 'rb'))
            }
            
            # Headers without Content-Type to let requests set it with the proper boundary
            headers = {
                "x-api-key": self.api_key
            }
            
            # Make the API request
            response = requests.post(endpoint, headers=headers, files=files)
            
            # Close the file
            files['audio'][1].close()
            
            # Check for successful response
            if response.status_code == 200:
                result = response.json()
                
                # Format the response to match our application's structure
                formatted_result = {
                    "provider": "hiya",
                    "probability": result.get("probability", 0.0),
                    "is_fake": result.get("classification", "") == "fake",
                    "confidence": result.get("confidence", 0.0),
                    "raw_response": result
                }
                
                # Add detailed analysis if available
                if "scores" in result:
                    formatted_result["details"] = result["scores"]
                
                return formatted_result
            else:
                error_message = f"Hiya API error: {response.status_code}"
                try:
                    error_data = response.json()
                    if "message" in error_data:
                        error_message = f"Hiya API error: {error_data['message']}"
                except:
                    pass
                
                raise Exception(error_message)
                
        except Exception as e:
            raise Exception(f"Error calling Hiya API: {str(e)}")
