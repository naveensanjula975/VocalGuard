"""
Script to evaluate model accuracy, precision, recall, and F1 on a benchmark dataset.

Usage:
  python utils/evaluate_models.py \
    --real-dir /path/to/real/audio \
    --fake-dir /path/to/fake/audio \
    --model-type ensemble
"""

import argparse
import os
import sys
from pathlib import Path
import logging

try:
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
except ImportError:
    print("Please install scikit-learn to run evaluation (pip install scikit-learn)")
    sys.exit(1)

# Ensure backend root is in sys.path
backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from core.detect_deepfake import detect_deepfake, detect_deepfake_ensemble
from logger import get_logger

logger = get_logger(__name__)


def evaluate_dataset(real_dir: str, fake_dir: str, model_type: str = "ensemble") -> None:
    """Analyze all audio files in the real/fake directories and report metrics."""
    real_files = []
    fake_files = []
    
    if real_dir and os.path.isdir(real_dir):
        real_files = [os.path.join(real_dir, f) for f in os.listdir(real_dir) if f.endswith(('.wav', '.mp3', '.flac'))]
    if fake_dir and os.path.isdir(fake_dir):
        fake_files = [os.path.join(fake_dir, f) for f in os.listdir(fake_dir) if f.endswith(('.wav', '.mp3', '.flac'))]

    if not real_files and not fake_files:
        logger.error("No valid audio files (.wav, .mp3, .flac) found in the specified directories.")
        return

    logger.info(f"Loaded {len(real_files)} real audio samples and {len(fake_files)} fake audio samples.")
    
    y_true = []
    y_pred = []
    probs = []

    total = len(real_files) + len(fake_files)
    processed = 0

    def process_file(filepath: str, is_actually_fake: bool) -> None:
        nonlocal processed
        
        try:
            if model_type == 'ensemble':
                res = detect_deepfake_ensemble(filepath, store_results=False)
            else:
                res = detect_deepfake(filepath, store_results=False, analysis_type=model_type)
            
            y_true.append(1 if is_actually_fake else 0)
            
            # Extract boolean prediction
            is_pred_fake = res.get('is_fake', False)
            y_pred.append(1 if is_pred_fake else 0)
            
            probs.append(res.get('confidence', 0.0))
            
        except Exception as e:
            logger.error(f"Failed to process {filepath}: {e}")
        
        processed += 1
        if processed % 10 == 0 or processed == total:
            logger.info(f"Progress: {processed}/{total} processed...")

    for f in real_files:
        process_file(f, is_actually_fake=False)
        
    for f in fake_files:
        process_file(f, is_actually_fake=True)

    if not y_true:
        logger.warning("No files successfully processed.")
        return

    # Compute metrics
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    print("\n" + "="*50)
    print(" " * 15 + "EVALUATION RESULTS")
    print("="*50)
    print(f"Model Evaluated : {model_type}")
    print(f"Total Samples   : {len(y_true)} ({sum(y_true)} Fake, {len(y_true)-sum(y_true)} Real)")
    print("-" * 50)
    print(f"Accuracy        : {acc*100:.2f}%")
    print(f"Precision       : {prec*100:.2f}%")
    print(f"Recall          : {rec*100:.2f}%")
    print(f"F1 Score        : {f1*100:.2f}%")
    print("="*50)
    
    print("\nClassification Report:")
    print(classification_report(y_true, y_pred, target_names=["Real (0)", "Fake (1)"], zero_division=0))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate VocalGuard models on benchmark datasets.")
    parser.add_argument("--real-dir", type=str, help="Path to directory containing REAL audio files.")
    parser.add_argument("--fake-dir", type=str, help="Path to directory containing FAKE audio files.")
    parser.add_argument("--model-type", type=str, default="ensemble", choices=["advanced", "standard", "ensemble"], help="Model type to evaluate.")
    
    args = parser.parse_args()
    
    if not args.real_dir and not args.fake_dir:
        print("Please provide at least one dataset directory using --real-dir or --fake-dir.")
        sys.exit(1)
        
    evaluate_dataset(args.real_dir, args.fake_dir, args.model_type)
