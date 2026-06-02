"""
Model Size Optimization — ONNX Export & Quantization.

Exports the Wav2Vec2 deepfake classifier to ONNX format and optionally
applies INT8 dynamic quantization for ~2–4x CPU inference speedup.

Usage:
  # Export to ONNX (fp32)
  python utils/export_onnx.py --output-dir ./models/onnx

  # Export and quantize to INT8
  python utils/export_onnx.py --output-dir ./models/onnx --quantize
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

import numpy as np
import torch
from transformers import Wav2Vec2FeatureExtractor, AutoModelForAudioClassification

from config import MODEL_DIR, MODEL_VERSION
from logger import get_logger

logger = get_logger(__name__)

ONNX_OPSET = 14  # Supports modern ops including attention


def export_to_onnx(model_path: str, output_path: str) -> str:
    """
    Export the Wav2Vec2 classifier to an ONNX file.
    Returns the path to the exported .onnx file.
    """
    logger.info("Loading model from: %s", model_path)
    feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(model_path)
    model = AutoModelForAudioClassification.from_pretrained(model_path, use_safetensors=True)
    model.eval()

    # Create a dummy input: 1 second of audio at 16 kHz
    dummy_audio = np.zeros(16000, dtype=np.float32)
    inputs = feature_extractor(dummy_audio, sampling_rate=16000, return_tensors="pt")
    input_values = inputs["input_values"]

    onnx_file = os.path.join(output_path, f"vocalguard_wav2vec2_v{MODEL_VERSION}.onnx")
    os.makedirs(output_path, exist_ok=True)

    logger.info("Exporting model to ONNX (opset %d)...", ONNX_OPSET)
    with torch.no_grad():
        torch.onnx.export(
            model,
            (input_values,),
            onnx_file,
            opset_version=ONNX_OPSET,
            input_names=["input_values"],
            output_names=["logits"],
            dynamic_axes={
                "input_values": {0: "batch_size", 1: "sequence_length"},
                "logits": {0: "batch_size"},
            },
            do_constant_folding=True,
        )

    size_mb = os.path.getsize(onnx_file) / (1024 * 1024)
    logger.info("ONNX export complete: %s (%.1f MB)", onnx_file, size_mb)
    print(f"\n✅ ONNX model exported to: {onnx_file}")
    print(f"   Model size: {size_mb:.1f} MB")
    return onnx_file


def quantize_onnx(onnx_path: str) -> str:
    """
    Apply INT8 dynamic quantization using ONNX Runtime's quantization tools.
    Results in ~2–4x size reduction and significant CPU speedup.
    """
    try:
        from onnxruntime.quantization import quantize_dynamic, QuantType
    except ImportError:
        print("onnxruntime-tools not installed. Run: pip install onnxruntime")
        return onnx_path

    quantized_path = onnx_path.replace(".onnx", "_int8.onnx")
    logger.info("Quantizing to INT8: %s → %s", onnx_path, quantized_path)

    quantize_dynamic(
        model_input=onnx_path,
        model_output=quantized_path,
        weight_type=QuantType.QInt8,
        per_channel=False,  # More compatible across hardware
    )

    orig_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    quant_mb = os.path.getsize(quantized_path) / (1024 * 1024)
    reduction = (1 - quant_mb / orig_mb) * 100

    print(f"\n✅ INT8 quantized model saved to: {quantized_path}")
    print(f"   Original size : {orig_mb:.1f} MB")
    print(f"   Quantized size: {quant_mb:.1f} MB  ({reduction:.0f}% reduction)")
    return quantized_path


def validate_onnx(onnx_path: str) -> bool:
    """Quick validation that the ONNX model runs without errors."""
    try:
        import onnxruntime as ort

        sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
        dummy_input = np.zeros((1, 16000), dtype=np.float32)
        outputs = sess.run(None, {"input_values": dummy_input})
        logits = outputs[0]
        pred = int(np.argmax(logits, axis=1)[0])
        logger.info("ONNX validation passed. Output shape: %s, Prediction index: %d", logits.shape, pred)
        return True
    except Exception as exc:
        logger.error("ONNX validation failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Export VocalGuard model to ONNX with optional INT8 quantization.")
    parser.add_argument("--model-dir", default=str(MODEL_DIR), help="Path to model directory.")
    parser.add_argument("--output-dir", default="./models/onnx", help="Output directory for ONNX files.")
    parser.add_argument("--quantize", action="store_true", help="Apply INT8 dynamic quantization.")
    parser.add_argument("--validate", action="store_true", default=True, help="Validate the exported model.")
    args = parser.parse_args()

    onnx_path = export_to_onnx(args.model_dir, args.output_dir)

    if args.validate:
        ok = validate_onnx(onnx_path)
        print(f"\n   Validation: {'✅ Passed' if ok else '❌ Failed'}")

    if args.quantize:
        quantized_path = quantize_onnx(onnx_path)
        if args.validate:
            ok = validate_onnx(quantized_path)
            print(f"   INT8 Validation: {'✅ Passed' if ok else '❌ Failed'}")


if __name__ == "__main__":
    main()
