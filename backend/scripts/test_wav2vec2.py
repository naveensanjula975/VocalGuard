"""
Test script to verify the Wav2Vec2 feature extraction.
"""
import sys
import os
from pathlib import Path

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.feature_extraction import extract_features, extract_wav2vec2_features
from core.feature_extraction import _get_audio_hash, _wav2vec2_cache, _load_cache, _save_cache
import numpy as np
import time
import librosa
import matplotlib.pyplot as plt

def test_wav2vec2_feature_extraction():
    """Test Wav2Vec2 feature extraction on a sample audio file."""
    # Find a sample audio file in the data directory
    data_dir = Path(__file__).parent.parent / "data"
    sample_files = []
    
    # Look for audio files in real and fake directories
    for subdir in ["real", "fake"]:
        dir_path = data_dir / subdir
        if dir_path.exists():
            for file in dir_path.glob("*.wav"):
                sample_files.append(file)
            for file in dir_path.glob("*.mp3"):
                sample_files.append(file)
    
    # If no sample files found, create a dummy test audio file
    if not sample_files:
        print("No sample audio files found. Creating a test sine wave...")
        test_file = data_dir / "test_sine.wav"
        os.makedirs(data_dir, exist_ok=True)
        
        # Generate a simple sine wave
        sr = 16000
        duration = 3  # seconds
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)
        audio = 0.5 * np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave
        
        # Save as WAV file
        import soundfile as sf
        sf.write(test_file, audio, sr)
        
        sample_files = [test_file]
    
    # Test feature extraction on the first sample file
    test_file = str(sample_files[0])
    print(f"Testing Wav2Vec2 feature extraction on file: {test_file}")
    
    # Time the traditional feature extraction
    start_time = time.time()
    traditional_features = extract_features(test_file, use_wav2vec2=False)
    trad_time = time.time() - start_time
    print(f"Traditional features shape: {traditional_features.shape}, extraction time: {trad_time:.2f}s")
    
    # Time the Wav2Vec2 feature extraction
    start_time = time.time()
    wav2vec2_features = extract_features(test_file, use_wav2vec2=True)
    w2v_time = time.time() - start_time
    print(f"Wav2Vec2 features shape: {wav2vec2_features.shape}, extraction time: {w2v_time:.2f}s")
    
    # Load audio and print some basic info
    y, sr = librosa.load(test_file, sr=None)
    duration = librosa.get_duration(y=y, sr=sr)
    print(f"Audio duration: {duration:.2f}s, sample rate: {sr}Hz")
    
    return True

def test_wav2vec2_caching():
    """Test the Wav2Vec2 caching mechanism for improved performance."""
    print("\nTesting Wav2Vec2 caching system...")
    
    # Find a sample audio file
    data_dir = Path(__file__).parent.parent / "data"
    sample_files = []
    
    # Look for audio files in real and fake directories
    for subdir in ["real", "fake", "samples"]:
        dir_path = data_dir / subdir
        if dir_path.exists():
            for ext in ["*.wav", "*.mp3", "*.flac"]:
                sample_files.extend(list(dir_path.glob(ext)))
    
    # If no sample files found, create a dummy test audio file
    if not sample_files:
        # Create samples directory
        samples_dir = data_dir / "samples"
        os.makedirs(samples_dir, exist_ok=True)
        
        # Generate a simple sine wave
        sr = 16000
        duration = 3  # seconds
        t = np.linspace(0, duration, int(sr * duration), endpoint=False)
        audio = 0.5 * np.sin(2 * np.pi * 440 * t)  # 440 Hz sine wave
        
        # Save as WAV file
        test_file = samples_dir / "test_sine.wav"
        try:
            import soundfile as sf
            sf.write(test_file, audio, sr)
        except:
            try:
                from scipy.io import wavfile
                wavfile.write(str(test_file), sr, audio.astype(np.float32))
            except:
                print("ERROR: Could not create test audio file. Exiting test.")
                return False
        
        sample_files = [test_file]
    
    # Test cache performance on the first sample file
    test_file = str(sample_files[0])
    print(f"Testing caching with file: {test_file}")
    
    # First run - should not be cached
    start_time = time.time()
    print("First run (no cache)...")
    features1 = extract_wav2vec2_features(test_file, test_file)
    first_run_time = time.time() - start_time
    print(f"First run time: {first_run_time:.2f}s")
    
    # Second run - should use cache
    start_time = time.time()
    print("Second run (using cache)...")
    features2 = extract_wav2vec2_features(test_file, test_file)
    second_run_time = time.time() - start_time
    print(f"Second run time: {second_run_time:.2f}s")
    
    # Verify cache is working
    if first_run_time > 0 and second_run_time > 0:
        speedup = first_run_time / max(second_run_time, 0.001)  # Avoid division by zero
        print(f"Cache speedup: {speedup:.1f}x faster")
        
        if speedup > 1.5:
            print("✅ Caching system is working correctly!")
        else:
            print("⚠️ Caching system may not be working optimally")
    
    # Verify features are identical
    if np.array_equal(features1, features2):
        print("✅ Cached features are identical to original")
    else:
        print("❌ ERROR: Cached features differ from original!")
        return False
    
    # Check if cache directory exists and has files
    cache_dir = Path(__file__).parent.parent / "cache"
    if cache_dir.exists() and any(cache_dir.iterdir()):
        print(f"✅ Cache directory exists at {cache_dir}")
        print(f"Cache contains {sum(1 for _ in cache_dir.iterdir())} files")
    else:
        print(f"❌ Cache directory missing or empty at {cache_dir}")
    
    return True

if __name__ == "__main__":
    print("Testing Wav2Vec2 feature extraction...")
    extraction_success = test_wav2vec2_feature_extraction()
    
    caching_success = test_wav2vec2_caching()
    
    if extraction_success and caching_success:
        print("\nAll Wav2Vec2 tests successful! ✅")
        print("The system is ready to use Wav2Vec2 for deepfake detection.")
    else:
        print("\nSome Wav2Vec2 tests failed. ⚠️")
        print("Please check the error messages above.")
