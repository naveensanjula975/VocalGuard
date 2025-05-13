"""
Test script to verify the new backend structure is working correctly
"""
import os
import sys
from pathlib import Path

# Add parent directory to path for imports
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

try:
    # Test Firebase initialization
    from backend.services.firebase_config import initialize_firebase
    print("Testing Firebase initialization...")
    initialize_firebase()
    print("✓ Firebase initialization successful")
    
    # Test imports from different modules
    print("\nTesting module imports...")
    from backend.models.models import UserSignUp, UserLogin
    print("✓ Models import successful")
    
    from backend.core.preprocessing import load_audio, preprocess_audio
    print("✓ Core preprocessing import successful")
    
    from backend.core.feature_extraction import extract_mel_spectrogram
    print("✓ Core feature extraction import successful")
    
    # Verify directory structure
    print("\nVerifying directory structure...")
    directories = [
        "config", 
        "core", 
        "data/real", 
        "data/fake", 
        "models", 
        "results", 
        "services"
    ]
    
    for directory in directories:
        path = current_dir / directory
        exists = path.exists()
        print(f"{'✓' if exists else '✗'} {directory} {'exists' if exists else 'does not exist'}")
    
    # Verify key files
    print("\nVerifying key files...")
    key_files = [
        "config/serviceAccountKey.json",
        "core/__init__.py",
        "core/preprocessing.py",
        "core/feature_extraction.py",
        "core/augmentation.py",
        "core/train.py",
        "core/evaluate.py",
        "core/detect_deepfake.py",
        "models/__init__.py",
        "models/models.py",
        "services/__init__.py",
        "services/firebase_config.py",
        "main.py"
    ]
    
    for file in key_files:
        path = current_dir / file
        exists = path.exists()
        print(f"{'✓' if exists else '✗'} {file} {'exists' if exists else 'does not exist'}")
    
    print("\nAll tests completed!")
    
except Exception as e:
    print(f"\nError occurred during testing: {str(e)}")
    print("\nRecommended fixes:")
    print("1. Make sure all __init__.py files are in place in each package directory")
    print("2. Check that serviceAccountKey.json is in the config directory")
    print("3. Verify that you can import from the top-level package (backend)")
