#!/usr/bin/env python3
"""
Audio preprocessing script for the Wav2Vec2 model
This script converts audio files to the format required by the model
"""
import os
import sys
import argparse
import librosa
import soundfile as sf
from pathlib import Path
from tqdm import tqdm

def preprocess_audio(input_path, output_path=None, target_sr=16000):
    """
    Preprocess an audio file for Wav2Vec2 model
    
    Args:
        input_path: Path to input audio file
        output_path: Path to save processed file (if None, derived from input_path)
        target_sr: Target sample rate (default: 16kHz for Wav2Vec2)
    
    Returns:
        Path to processed audio file
    """
    # Derive output path if not provided
    if output_path is None:
        dirname = os.path.dirname(input_path)
        basename = os.path.basename(input_path)
        filename, _ = os.path.splitext(basename)
        output_path = os.path.join(dirname, f"{filename}_processed.wav")
    
    # Load audio file
    print(f"Loading audio: {input_path}")
    y, sr = librosa.load(input_path, sr=None)
    
    # Resample if needed
    if sr != target_sr:
        print(f"Resampling from {sr}Hz to {target_sr}Hz")
        y = librosa.resample(y, orig_sr=sr, target_sr=target_sr)
    
    # Convert to mono if stereo
    if len(y.shape) > 1:
        print("Converting to mono")
        y = librosa.to_mono(y)
    
    # Save processed audio
    print(f"Saving processed audio to: {output_path}")
    sf.write(output_path, y, target_sr, format='WAV')
    
    return output_path

def batch_process(input_dir, output_dir=None, target_sr=16000):
    """
    Batch process all audio files in a directory
    
    Args:
        input_dir: Directory containing audio files
        output_dir: Directory to save processed files (if None, same as input_dir)
        target_sr: Target sample rate
    """
    if not os.path.exists(input_dir):
        print(f"Input directory does not exist: {input_dir}")
        return
    
    if output_dir is None:
        output_dir = input_dir
    else:
        os.makedirs(output_dir, exist_ok=True)
    
    # Find all audio files
    audio_files = []
    for root, _, files in os.walk(input_dir):
        for file in files:
            if file.endswith(('.wav', '.mp3', '.flac', '.m4a', '.aac', '.ogg')):
                audio_files.append(os.path.join(root, file))
    
    if not audio_files:
        print("No audio files found for processing.")
        return
    
    print(f"Found {len(audio_files)} audio files for processing")
    
    # Process each file
    for input_path in tqdm(audio_files, desc="Processing audio files"):
        try:
            rel_path = os.path.relpath(input_path, input_dir)
            output_path = os.path.join(output_dir, os.path.splitext(rel_path)[0] + "_processed.wav")
            
            # Create directories if needed
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            preprocess_audio(input_path, output_path, target_sr)
        except Exception as e:
            print(f"Error processing {input_path}: {e}")
    
    print(f"All files processed and saved to: {output_dir}")

def main():
    parser = argparse.ArgumentParser(description="Preprocess audio files for Wav2Vec2 model")
    parser.add_argument("--file", type=str, help="Single audio file to process")
    parser.add_argument("--input-dir", type=str, help="Directory containing audio files to process")
    parser.add_argument("--output-dir", type=str, help="Directory to save processed files")
    parser.add_argument("--sample-rate", type=int, default=16000, help="Target sample rate (default: 16000)")
    
    args = parser.parse_args()
    
    if args.file:
        # Process a single file
        preprocess_audio(args.file, args.output_dir, args.sample_rate)
    elif args.input_dir:
        # Batch process files
        batch_process(args.input_dir, args.output_dir, args.sample_rate)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
