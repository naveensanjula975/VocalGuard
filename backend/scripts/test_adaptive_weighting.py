"""
Test script for adaptive feature weighting in VocalGuard

This script demonstrates how the system adjusts feature weights based on audio characteristics
and the impact on detection results.
"""

import sys
import os
from pathlib import Path

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import librosa
import matplotlib.pyplot as plt
from core.feature_extraction import extract_features, extract_wav2vec2_features
from core.feature_weighting import get_weights, calculate_audio_complexity
from models.models import DeepFakeDetector
import torch

# Import for audio file writing
try:
    import soundfile as sf
except ImportError:
    try:
        from scipy.io import wavfile
    except ImportError:
        print("Warning: Neither soundfile nor scipy.io.wavfile is available for writing audio files")
        print("Installing soundfile may resolve this issue: pip install soundfile")

def find_audio_file():
    """Find an audio file to test with"""
    # Look in data directories
    data_dir = Path(__file__).parent.parent / "data"
    
    # Try to find audio files
    audio_files = []
    for subdir in ["real", "fake"]:
        dir_path = data_dir / subdir
        if dir_path.exists():
            for ext in ["*.wav", "*.mp3", "*.flac"]:
                audio_files.extend(list(dir_path.glob(ext)))
    
    if not audio_files:
        print("No audio files found. Creating a test audio...")
        # Create sample audio files with different characteristics
        create_sample_audio_files()
        # Look again
        for subdir in ["samples"]:
            dir_path = data_dir / subdir
            if dir_path.exists():
                for ext in ["*.wav"]:
                    audio_files.extend(list(dir_path.glob(ext)))
    
    return audio_files

def create_sample_audio_files():
    """Create sample audio files with different characteristics"""
    samples_dir = Path(__file__).parent.parent / "data" / "samples"
    os.makedirs(samples_dir, exist_ok=True)
    
    # Sample rate
    sr = 16000
    duration = 3  # seconds
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # Sample 1: Clean sine wave (simple)
    clean_audio = 0.5 * np.sin(2 * np.pi * 440 * t)
    try:
        # For newer librosa versions
        import soundfile as sf
        sf.write(samples_dir / "clean_tone.wav", clean_audio, sr)
    except:
        try:
            # For older librosa versions
            librosa.output.write_wav(samples_dir / "clean_tone.wav", clean_audio, sr)
        except:
            # Manual fallback
            from scipy.io import wavfile
            wavfile.write(str(samples_dir / "clean_tone.wav"), sr, clean_audio.astype(np.float32))
    
    # Sample 2: Speech-like audio (medium complexity)
    speech_like = np.sin(2 * np.pi * 120 * t)  # Fundamental
    speech_like += 0.5 * np.sin(2 * np.pi * 240 * t)  # First harmonic
    speech_like += 0.3 * np.sin(2 * np.pi * 360 * t)  # Second harmonic
    speech_like += 0.1 * np.random.randn(len(t))  # Small amount of noise
    speech_like = speech_like / np.max(np.abs(speech_like))  # Normalize
    try:
        sf.write(samples_dir / "speech_like.wav", speech_like, sr)
    except:
        try:
            librosa.output.write_wav(samples_dir / "speech_like.wav", speech_like, sr)
        except:
            wavfile.write(str(samples_dir / "speech_like.wav"), sr, speech_like.astype(np.float32))
    
    # Sample 3: Noisy audio (high complexity)
    noise = np.random.randn(int(sr * duration))
    noisy_audio = 0.3 * np.sin(2 * np.pi * 440 * t) + 0.7 * noise
    noisy_audio = noisy_audio / np.max(np.abs(noisy_audio))  # Normalize
    try:
        sf.write(samples_dir / "noisy_audio.wav", noisy_audio, sr)
    except:
        try:
            librosa.output.write_wav(samples_dir / "noisy_audio.wav", noisy_audio, sr)
        except:
            wavfile.write(str(samples_dir / "noisy_audio.wav"), sr, noisy_audio.astype(np.float32))

def test_adaptive_weighting():
    """Test adaptive weighting on different audio files"""
    audio_files = find_audio_file()
    
    if not audio_files:
        print("No audio files found for testing")
        return
    
    print(f"Testing adaptive weighting on {len(audio_files)} audio files")
    
    results = []
    
    for audio_path in audio_files:
        print(f"\nAnalyzing: {audio_path}")
        
        # Load audio
        y, sr = librosa.load(str(audio_path), sr=None)
        
        # Calculate complexity
        complexity = calculate_audio_complexity(y, sr)
        print(f"Audio complexity: {complexity:.3f}")
        
        # Get adaptive weights
        weights = get_weights(y, sr)
        print(f"Adaptive weights: {weights}")
        
        # Extract features with and without Wav2Vec2
        features_standard = extract_features(str(audio_path), use_wav2vec2=False)
        features_wav2vec2 = extract_features(str(audio_path), use_wav2vec2=True)
        
        # Get Wav2Vec2 embeddings directly
        wav2vec2_only = extract_wav2vec2_features(y, str(audio_path))
        
        # Load model
        model = DeepFakeDetector()
        
        # Make predictions with both feature sets
        with torch.no_grad():
            # Standard features
            prediction_std = model(torch.tensor(features_standard, dtype=torch.float32).unsqueeze(0)).item()
            
            # Wav2Vec2 features
            prediction_w2v = model(torch.tensor(features_wav2vec2, dtype=torch.float32).unsqueeze(0)).item()
        
        print(f"Standard prediction: {prediction_std:.4f}")
        print(f"Wav2Vec2 prediction: {prediction_w2v:.4f}")
        
        # Store results for plotting
        results.append({
            "filename": audio_path.name,
            "complexity": complexity,
            "weights": weights,
            "prediction_std": prediction_std,
            "prediction_w2v": prediction_w2v,
            "difference": abs(prediction_std - prediction_w2v)
        })
    
    # Visualize results
    visualize_results(results)
    
    return results

def visualize_results(results):
    """Visualize the impact of adaptive weighting"""
    plt.figure(figsize=(12, 8))
    
    # Sort results by complexity
    results.sort(key=lambda x: x["complexity"])
    
    # Extract data for plotting
    filenames = [r["filename"] for r in results]
    complexities = [r["complexity"] for r in results]
    w2v_weights = [r["weights"]["wav2vec2"] for r in results]
    prediction_std = [r["prediction_std"] for r in results]
    prediction_w2v = [r["prediction_w2v"] for r in results]
    
    # Plot complexity vs wav2vec2 weight
    plt.subplot(2, 1, 1)
    plt.plot(complexities, w2v_weights, 'o-', label='Wav2Vec2 Weight')
    plt.xlabel('Audio Complexity')
    plt.ylabel('Wav2Vec2 Weight')
    plt.title('Adaptive Weight Assignment Based on Audio Complexity')
    plt.grid(True, alpha=0.3)
    plt.ylim(0, 1)
    
    # Plot predictions comparison
    plt.subplot(2, 1, 2)
    bar_width = 0.35
    x = np.arange(len(filenames))
    plt.bar(x - bar_width/2, prediction_std, bar_width, label='Standard Features')
    plt.bar(x + bar_width/2, prediction_w2v, bar_width, label='With Wav2Vec2')
    plt.xlabel('Audio File')
    plt.ylabel('Prediction Score')
    plt.title('Prediction Comparison: Standard vs Wav2Vec2')
    plt.xticks(x, filenames, rotation=45)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.ylim(0, 1)
    
    plt.tight_layout()
    
    # Save figure
    output_dir = Path(__file__).parent.parent / "results"
    os.makedirs(output_dir, exist_ok=True)
    plt.savefig(output_dir / "adaptive_weighting_comparison.png")
    print(f"Results visualization saved to: {output_dir / 'adaptive_weighting_comparison.png'}")
    
    plt.close()

if __name__ == "__main__":
    print("Testing VocalGuard's Adaptive Feature Weighting...\n")
    results = test_adaptive_weighting()
    
    if results:
        print("\nTest completed successfully!")
        print("The adaptive weighting system adjusts feature importance based on audio complexity.")
        print("This helps optimize detection accuracy across different audio types.")
    else:
        print("\nTest failed! Please check error messages above.")
