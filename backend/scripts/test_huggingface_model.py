#!/usr/bin/env python3
"""
Test script for the Wav2Vec2 model with safetensors for deepfake audio detection
"""
import os
import sys
from pathlib import Path

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the detector
from core.detect_deepfake import DeepfakeAudioDetector, MODEL_DIR

def main():
    """
    Main function to test the DeepfakeAudioDetector with sample audio files
    """
    print("\n=== Testing DeepfakeAudioDetector with Wav2Vec2 Safetensors Model ===\n")
    
    # Initialize detector with model path
    print(f"Loading model from: {MODEL_DIR}")
    detector = DeepfakeAudioDetector(MODEL_DIR)
    
    # Find sample audio files in the data directory
    data_dir = os.path.join(Path(__file__).parent.parent, "data")
    real_dir = os.path.join(data_dir, "real")
    fake_dir = os.path.join(data_dir, "fake")
    
    # Check if directories exist
    if not os.path.exists(real_dir):
        os.makedirs(real_dir)
        print(f"Created directory: {real_dir}")
    
    if not os.path.exists(fake_dir):
        os.makedirs(fake_dir)
        print(f"Created directory: {fake_dir}")
    
    # Get sample files
    real_files = [os.path.join(real_dir, f) for f in os.listdir(real_dir) 
                  if f.endswith(('.wav', '.mp3', '.flac'))][:2]
    fake_files = [os.path.join(fake_dir, f) for f in os.listdir(fake_dir) 
                  if f.endswith(('.wav', '.mp3', '.flac'))][:2]
    
    if not real_files and not fake_files:
        print("No sample audio files found. Please add some .wav, .mp3, or .flac files to the data/real and data/fake directories.")
        return
    
    # Test on both real and fake samples
    sample_files = real_files + fake_files
    if not sample_files:
        # Use a test file from the internet if no local files are available
        import requests
        print("No local files found. Downloading a test file...")
        
        # Download a sample file
        test_url = "https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav"
        temp_file = os.path.join(data_dir, "test_sample.wav")
        
        response = requests.get(test_url)
        if response.status_code == 200:
            with open(temp_file, "wb") as f:
                f.write(response.content)
            sample_files = [temp_file]
            print(f"Downloaded test file to: {temp_file}")
        else:
            print("Failed to download test file. Please add audio files manually.")
            return
    
    for file_path in sample_files:
        if os.path.exists(file_path):
            print(f"\nTesting on: {os.path.basename(file_path)}")
            result = detector.detect(file_path)
            print(f"Prediction: {result['prediction']}")
            print(f"Confidence: {result['confidence']:.4f}")
            print(f"Is fake: {result['is_fake']}")
            
            print("Probabilities:")
            for label, prob in result['probabilities'].items():
                print(f"  {label}: {prob:.4f}")
        else:
            print(f"File not found: {file_path}")
    
    print("\n=== Test completed ===")

if __name__ == "__main__":
    main()
