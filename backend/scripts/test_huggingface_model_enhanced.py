#!/usr/bin/env python3
"""
Enhanced test script for the Wav2Vec2 model with safetensors for deepfake audio detection
This script tests the model with multiple audio files and provides detailed analysis
"""
import os
import sys
import time
import argparse
import json
from pathlib import Path
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np

# Add the parent directory to system path to enable relative imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the detector
from core.detect_deepfake import DeepfakeAudioDetector, MODEL_DIR

def plot_results(results, output_path=None):
    """
    Generate a visualization of the detection results
    """
    # Prepare data
    filenames = [r['filename'] for r in results]
    fake_probs = [r['fake_prob'] for r in results]
    real_probs = [r['real_prob'] for r in results]
    is_fake = [r['is_fake'] for r in results]
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 6))
    
    # Set up bar width
    bar_width = 0.35
    index = np.arange(len(filenames))
    
    # Create bars
    fake_bars = ax.bar(index, fake_probs, bar_width, color='red', alpha=0.7, label='Fake Probability')
    real_bars = ax.bar(index + bar_width, real_probs, bar_width, color='green', alpha=0.7, label='Real Probability')
    
    # Add labels and title
    ax.set_xlabel('Audio Files')
    ax.set_ylabel('Probability')
    ax.set_title('Deepfake Detection Results')
    ax.set_xticks(index + bar_width / 2)
    ax.set_xticklabels(filenames, rotation=45, ha='right')
    ax.legend()
    
    # Add a horizontal line at 0.5 probability
    ax.axhline(y=0.5, color='gray', linestyle='--', alpha=0.5)
    
    # Add text annotations for the classification
    for i, (f, r) in enumerate(zip(fake_probs, real_probs)):
        classification = "FAKE" if is_fake[i] else "REAL"
        color = "red" if is_fake[i] else "green"
        ax.text(i + bar_width/2, max(f, r) + 0.05, classification, 
                ha='center', va='bottom', color=color, fontweight='bold')
    
    plt.tight_layout()
    
    # Save or show the figure
    if output_path:
        plt.savefig(output_path)
        print(f"Results visualization saved to: {output_path}")
    else:
        plt.show()

def test_audio_file(detector, audio_path, verbose=False):
    """
    Test a single audio file with the detector
    """
    filename = os.path.basename(audio_path)
    print(f"\nTesting file: {filename}")
    
    start_time = time.time()
    result = detector.detect(audio_path)
    processing_time = time.time() - start_time
    
    # Extract results
    probabilities = result.get('probabilities', {})
    fake_prob = probabilities.get('fake', 0.0)
    real_prob = probabilities.get('real', 0.0)
    prediction = result.get('prediction', 'unknown')
    is_fake = result.get('is_fake', False)
    
    # Display results
    print(f"Prediction: {prediction.upper()}")
    print(f"Is fake: {is_fake}")
    print(f"Confidence: {result.get('confidence', 0.0):.4f}")
    print(f"Processing time: {processing_time:.2f} seconds")
    
    if verbose:
        print("\nProbabilities:")
        for label, prob in probabilities.items():
            print(f"  {label}: {prob:.4f}")
    
    return {
        "filename": filename,
        "path": audio_path,
        "prediction": prediction,
        "is_fake": is_fake,
        "confidence": result.get('confidence', 0.0),
        "fake_prob": fake_prob,
        "real_prob": real_prob,
        "processing_time": processing_time,
        "probabilities": probabilities
    }

def run_batch_test(verbose=False, test_dir=None, output_json=None, output_chart=None):
    """
    Run tests on multiple audio files and generate a report
    """
    print("\n=== Starting Batch Testing of Wav2Vec2 Model ===\n")
    
    # Find audio files to test
    if test_dir:
        if not os.path.exists(test_dir):
            print(f"Test directory not found: {test_dir}")
            return
        
        audio_files = []
        for root, _, files in os.walk(test_dir):
            for file in files:
                if file.endswith(('.wav', '.mp3', '.flac')):
                    audio_files.append(os.path.join(root, file))
    else:
        # Use default data directories
        base_dir = os.path.join(Path(__file__).parent.parent, "data")
        fake_dir = os.path.join(base_dir, "fake")
        real_dir = os.path.join(base_dir, "real")
        
        audio_files = []
        
        # Find audio files in fake directory
        if os.path.exists(fake_dir):
            for file in os.listdir(fake_dir):
                if file.endswith(('.wav', '.mp3', '.flac')):
                    audio_files.append(os.path.join(fake_dir, file))
        
        # Find audio files in real directory
        if os.path.exists(real_dir):
            for file in os.listdir(real_dir):
                if file.endswith(('.wav', '.mp3', '.flac')):
                    audio_files.append(os.path.join(real_dir, file))
    
    if not audio_files:
        print("No audio files found for testing.")
        print("Please add .wav, .mp3, or .flac files to the data/fake and data/real directories.")
        return
    
    print(f"Found {len(audio_files)} audio files for testing")
    
    # Initialize the detector
    print(f"Loading model from: {MODEL_DIR}")
    try:
        detector = DeepfakeAudioDetector(MODEL_DIR)
        print("Model loaded successfully")
    except Exception as e:
        print(f"Error loading model: {e}")
        return
    
    # Process all files
    results = []
    for audio_path in audio_files:
        try:
            result = test_audio_file(detector, audio_path, verbose)
            results.append(result)
        except Exception as e:
            print(f"Error processing {os.path.basename(audio_path)}: {e}")
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Total files tested: {len(results)}")
    fake_count = sum(1 for r in results if r['is_fake'])
    real_count = len(results) - fake_count
    print(f"Files classified as FAKE: {fake_count}")
    print(f"Files classified as REAL: {real_count}")
    
    avg_time = sum(r['processing_time'] for r in results) / len(results) if results else 0
    print(f"Average processing time: {avg_time:.2f} seconds")
    
    # Save results to JSON if requested
    if output_json:
        try:
            with open(output_json, 'w') as f:
                json.dump({
                    "timestamp": datetime.now().isoformat(),
                    "model_path": MODEL_DIR,
                    "total_files": len(results),
                    "fake_count": fake_count,
                    "real_count": real_count,
                    "average_processing_time": avg_time,
                    "results": results
                }, f, indent=2)
            print(f"Results saved to: {output_json}")
        except Exception as e:
            print(f"Error saving results to JSON: {e}")
    
    # Generate chart if requested
    if output_chart or (not output_chart and len(results) > 0):
        try:
            chart_path = output_chart or os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                              "data", "test_results.png")
            plot_results(results, chart_path)
        except Exception as e:
            print(f"Error generating chart: {e}")
    
    print("\n=== Test completed ===")
    return results

def main():
    parser = argparse.ArgumentParser(description="Test the Hugging Face Wav2Vec2 model for deepfake audio detection")
    parser.add_argument("--file", type=str, help="Single audio file to test")
    parser.add_argument("--dir", type=str, help="Directory containing audio files to test")
    parser.add_argument("--verbose", action="store_true", help="Display detailed information")
    parser.add_argument("--output-json", type=str, help="Path to save results as JSON")
    parser.add_argument("--output-chart", type=str, help="Path to save results chart")
    
    args = parser.parse_args()
    
    if args.file:
        # Test a single file
        detector = DeepfakeAudioDetector(MODEL_DIR)
        test_audio_file(detector, args.file, args.verbose)
    else:
        # Run batch test
        run_batch_test(
            verbose=args.verbose,
            test_dir=args.dir,
            output_json=args.output_json,
            output_chart=args.output_chart
        )

if __name__ == "__main__":
    main()
