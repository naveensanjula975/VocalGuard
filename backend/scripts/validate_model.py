#!/usr/bin/env python3
"""
Model validation script for the Wav2Vec2 deepfake audio detection model
This script validates the model structure, configuration, and basic functionality
"""
import os
import sys
import json
import torch
from pathlib import Path
from transformers import (
    Wav2Vec2FeatureExtractor, 
    AutoModelForAudioClassification,
    Wav2Vec2Config
)

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the detector
from core.detect_deepfake import DeepfakeAudioDetector, MODEL_DIR

def validate_model_files(model_dir):
    """
    Check if all required model files exist in the directory
    """
    print(f"\nValidating model files in: {model_dir}")
    
    # Required files for a Hugging Face model
    required_files = [
        "config.json",
        "preprocessor_config.json",
        "model.safetensors"
    ]
    
    all_files_exist = True
    for filename in required_files:
        file_path = os.path.join(model_dir, filename)
        exists = os.path.exists(file_path)
        status = "✓" if exists else "✗"
        print(f"{status} {filename}")
        
        if not exists:
            all_files_exist = False
    
    if all_files_exist:
        print("\n✅ All required model files are present")
    else:
        print("\n❌ Some required model files are missing")
    
    return all_files_exist

def check_gpu_support():
    """
    Check if GPU is available and can be used for inference
    """
    print("\nChecking GPU support:")
    
    if torch.cuda.is_available():
        print(f"✓ CUDA is available (PyTorch {torch.__version__})")
        
        device_count = torch.cuda.device_count()
        print(f"✓ Found {device_count} CUDA device(s)")
        
        for i in range(device_count):
            device_name = torch.cuda.get_device_name(i)
            print(f"  - Device {i}: {device_name}")
        
        # Check CUDA memory
        device = torch.device("cuda:0")
        try:
            # Create a test tensor
            test_tensor = torch.zeros(1, 1000, device=device)
            # Get memory info
            total_memory = torch.cuda.get_device_properties(0).total_memory
            free_memory = torch.cuda.memory_reserved(0) - torch.cuda.memory_allocated(0)
            print(f"✓ Total GPU memory: {total_memory / 1e9:.2f} GB")
            print(f"✓ Free GPU memory: {free_memory / 1e9:.2f} GB")
        except Exception as e:
            print(f"✗ Error testing CUDA memory: {e}")
    else:
        print("✗ CUDA is not available")
        print("  - Using CPU for inference (will be slower)")
    
    return torch.cuda.is_available()

def analyze_model_config(model_dir):
    """
    Analyze the model configuration
    """
    print("\nAnalyzing model configuration:")
    
    config_path = os.path.join(model_dir, "config.json")
    if not os.path.exists(config_path):
        print("✗ Configuration file not found")
        return False
    
    try:
        # Load the config directly from file
        with open(config_path, 'r') as f:
            config_data = json.load(f)
        
        # Load the config using transformers
        config = Wav2Vec2Config.from_pretrained(model_dir)
        
        # Basic model info
        print(f"✓ Model type: {config_data.get('model_type', 'unknown')}")
        print(f"✓ Hidden size: {config_data.get('hidden_size', 'unknown')}")
        
        # Check if model is for classification
        if 'id2label' in config_data:
            print("✓ Model is configured for classification")
            print(f"✓ Number of labels: {len(config_data['id2label'])}")
            print(f"✓ Labels: {config_data['id2label']}")
        else:
            print("✗ Model is not configured for classification (missing id2label)")
        
        # Check for other important configuration
        if 'problem_type' in config_data:
            print(f"✓ Problem type: {config_data['problem_type']}")
        
        return True
    except Exception as e:
        print(f"✗ Error analyzing config: {e}")
        return False

def validate_feature_extractor(model_dir):
    """
    Validate the feature extractor configuration
    """
    print("\nValidating feature extractor:")
    
    config_path = os.path.join(model_dir, "preprocessor_config.json")
    if not os.path.exists(config_path):
        print("✗ Feature extractor config file not found")
        return False
    
    try:
        # Load the feature extractor
        feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_dir)
        
        # Check key properties
        print(f"✓ Feature extractor type: {type(feature_extractor).__name__}")
        print(f"✓ Sampling rate: {feature_extractor.sampling_rate}Hz")
        print(f"✓ Padding: {feature_extractor.padding}")
        
        return True
    except Exception as e:
        print(f"✗ Error validating feature extractor: {e}")
        return False

def test_model_loading():
    """
    Test if the model can be loaded successfully
    """
    print("\nTesting model loading:")
    
    try:
        start_time = torch.cuda.Event(enable_timing=True)
        end_time = torch.cuda.Event(enable_timing=True)
        
        # Start timing
        if torch.cuda.is_available():
            start_time.record()
        else:
            import time
            start = time.time()
        
        # Load the model
        model = AutoModelForAudioClassification.from_pretrained(
            MODEL_DIR, 
            use_safetensors=True
        )
        
        # End timing
        if torch.cuda.is_available():
            end_time.record()
            torch.cuda.synchronize()
            load_time = start_time.elapsed_time(end_time) / 1000  # Convert to seconds
        else:
            load_time = time.time() - start
        
        print(f"✓ Model loaded successfully in {load_time:.2f} seconds")
        
        # Check model size
        param_count = sum(p.numel() for p in model.parameters())
        print(f"✓ Model has {param_count:,} parameters")
        
        # Test moving to device
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = model.to(device)
        print(f"✓ Model moved to {device} successfully")
        
        return True
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        return False

def test_detector_init():
    """
    Test if the DeepfakeAudioDetector class can be instantiated
    """
    print("\nTesting DeepfakeAudioDetector initialization:")
    
    try:
        detector = DeepfakeAudioDetector(MODEL_DIR)
        print("✓ DeepfakeAudioDetector initialized successfully")
        print(f"✓ Using device: {detector.device}")
        print(f"✓ Model labels: {detector.id2label}")
        return True
    except Exception as e:
        print(f"✗ Error initializing DeepfakeAudioDetector: {e}")
        return False

def main():
    print("=" * 60)
    print("WAV2VEC2 DEEPFAKE AUDIO MODEL VALIDATION")
    print("=" * 60)
    
    # Check model files
    files_valid = validate_model_files(MODEL_DIR)
    
    # Check GPU support
    gpu_available = check_gpu_support()
    
    # Analyze model configuration
    config_valid = analyze_model_config(MODEL_DIR)
    
    # Validate feature extractor
    extractor_valid = validate_feature_extractor(MODEL_DIR)
    
    # Test model loading
    model_loadable = test_model_loading()
    
    # Test detector initialization
    detector_valid = test_detector_init()
    
    # Print summary
    print("\n" + "=" * 60)
    print("VALIDATION SUMMARY")
    print("=" * 60)
    print(f"Model files check:         {'PASSED' if files_valid else 'FAILED'}")
    print(f"GPU support:               {'AVAILABLE' if gpu_available else 'NOT AVAILABLE'}")
    print(f"Model configuration check: {'PASSED' if config_valid else 'FAILED'}")
    print(f"Feature extractor check:   {'PASSED' if extractor_valid else 'FAILED'}")
    print(f"Model loading test:        {'PASSED' if model_loadable else 'FAILED'}")
    print(f"Detector initialization:   {'PASSED' if detector_valid else 'FAILED'}")
    
    # Overall status
    all_passed = files_valid and config_valid and extractor_valid and model_loadable and detector_valid
    print("\nOverall validation: " + ("PASSED" if all_passed else "FAILED"))
    
    if all_passed:
        print("\n✅ The model is correctly set up and ready for use")
    else:
        print("\n❌ There are issues with the model setup that need to be addressed")

if __name__ == "__main__":
    main()
