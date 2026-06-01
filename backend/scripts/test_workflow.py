#!/usr/bin/env python
# coding: utf-8

"""
Test the full deepfake detection workflow with Firebase database integration
"""

import os
import sys
import tempfile
import soundfile as sf
import numpy as np
import time
from pathlib import Path

# Add the parent directory to system path to enable relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent))

from services.firebase_config import initialize_firebase
from services.database_service import DatabaseService
from core.detect_deepfake import detect_deepfake
from firebase_admin import auth

def create_test_audio():
    """Create a simple test audio file"""
    # Generate a simple sine wave
    sample_rate = 44100
    duration = 3.0  # seconds
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    tone = 0.5 * np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave
    
    # Create a temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_file.close()
    
    # Save the audio file
    sf.write(temp_file.name, tone, sample_rate)
    
    return temp_file.name

def test_workflow():
    """Test the full detection workflow with database integration"""
    print("Testing deepfake detection workflow with database integration...")
    
    # Initialize Firebase
    initialize_firebase()
    
    try:
        # Create test user or use existing one
        email = "test@vocalguard.com"
        password = "test123"
        
        try:
            user = auth.get_user_by_email(email)
            print(f"Test user already exists: {user.uid}")
        except:
            user = auth.create_user(
                email=email,
                password=password,
                display_name="Test User"
            )
            print(f"Created test user: {user.uid}")
        
        user_id = user.uid
        
        # Create test audio
        audio_path = create_test_audio()
        print(f"Created test audio file: {audio_path}")
        
        # Process the audio
        print("Processing audio file...")
        start_time = time.time()
        result = detect_deepfake(audio_path, user_id=user_id, store_results=True)
        processing_time = time.time() - start_time
        
        print(f"Detection complete in {processing_time:.2f} seconds")
        print(f"Result: {result}")
        
        # Verify database entries
        if "analysis_id" in result:
            db_service = DatabaseService()
            analysis = db_service.get_analysis(result["analysis_id"])
            print(f"\nDatabase record retrieved successfully:")
            print(f"Analysis ID: {analysis['id']}")
            print(f"Is deepfake: {analysis['is_deepfake']}")
            print(f"Confidence score: {analysis['confidence_score']}")
            
            if "metadata" in analysis:
                print(f"File: {analysis['metadata']['filename']}")
                print(f"Duration: {analysis['metadata']['duration']} seconds")
            
            if "details" in analysis:
                print(f"Model version: {analysis['details']['model_version']}")
                print(f"Feature scores: {analysis['details']['feature_scores']}")
        else:
            print("No analysis ID in result, database integration may have failed")
        
    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        # Clean up
        if os.path.exists(audio_path):
            os.remove(audio_path)
            print(f"Removed test audio file: {audio_path}")

if __name__ == "__main__":
    test_workflow()
