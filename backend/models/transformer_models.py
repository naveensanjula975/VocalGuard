"""
Transformer-based deepfake audio detection models.

Provides a custom multi-head attention transformer architecture
(``AudioTransformer``) and a high-level ``TransformerDeepfakeDetector``
wrapper that uses Wav2Vec2 features as input to the transformer.
"""

import math
import os

import librosa
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torchaudio
from safetensors.torch import load_file
from transformers import AutoModelForAudioClassification, Wav2Vec2FeatureExtractor

from logger import get_logger

logger = get_logger(__name__)


class MultiHeadAttention(nn.Module):
    """Multi-head attention mechanism for audio features."""

    def __init__(self, d_model, num_heads, dropout=0.1):
        super().__init__()
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads

        self.w_q = nn.Linear(d_model, d_model)
        self.w_k = nn.Linear(d_model, d_model)
        self.w_v = nn.Linear(d_model, d_model)
        self.w_o = nn.Linear(d_model, d_model)

        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)

    def scaled_dot_product_attention(self, Q, K, V, mask=None):
        """Compute scaled dot product attention."""
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)

        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)

        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)

        context = torch.matmul(attention_weights, V)
        return context, attention_weights

    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)

        # Linear transformations
        Q = self.w_q(query).view(
            batch_size, -1, self.num_heads, self.d_k,
        ).transpose(1, 2)
        K = self.w_k(key).view(
            batch_size, -1, self.num_heads, self.d_k,
        ).transpose(1, 2)
        V = self.w_v(value).view(
            batch_size, -1, self.num_heads, self.d_k,
        ).transpose(1, 2)

        # Apply attention
        context, attention_weights = self.scaled_dot_product_attention(
            Q, K, V, mask,
        )

        # Concatenate heads
        context = context.transpose(1, 2).contiguous().view(
            batch_size, -1, self.d_model,
        )

        # Final linear transformation
        output = self.w_o(context)

        # Residual connection and layer norm
        output = self.layer_norm(output + query)

        return output, attention_weights


class PositionalEncoding(nn.Module):
    """Positional encoding for transformer."""

    def __init__(self, d_model, max_len=5000):
        super().__init__()

        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(
            torch.arange(0, d_model, 2).float()
            * (-math.log(10000.0) / d_model)
        )

        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)

        self.register_buffer("pe", pe)

    def forward(self, x):
        return x + self.pe[:x.size(0), :]


class FeedForward(nn.Module):
    """Feed-forward network."""

    def __init__(self, d_model, d_ff, dropout=0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)

    def forward(self, x):
        output = self.linear2(self.dropout(F.relu(self.linear1(x))))
        return self.layer_norm(output + x)


class TransformerBlock(nn.Module):
    """Single transformer block."""

    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super().__init__()
        self.attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)

    def forward(self, x, mask=None):
        x, attention_weights = self.attention(x, x, x, mask)
        x = self.feed_forward(x)
        return x, attention_weights


class AudioTransformer(nn.Module):
    """Transformer model for audio deepfake detection with attention."""

    def __init__(
        self,
        input_dim=1024,
        d_model=512,
        num_heads=8,
        num_layers=6,
        d_ff=2048,
        max_len=1000,
        dropout=0.1,
        num_classes=2,
    ):
        super().__init__()

        self.d_model = d_model
        self.input_projection = nn.Linear(input_dim, d_model)
        self.positional_encoding = PositionalEncoding(d_model, max_len)

        self.transformer_blocks = nn.ModuleList([
            TransformerBlock(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])

        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)

        # Classification head
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.classifier = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, d_model // 4),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 4, num_classes),
        )

    def forward(self, x, mask=None):
        # Input projection
        x = self.input_projection(x)
        x = x * math.sqrt(self.d_model)

        # Add positional encoding
        x = self.positional_encoding(x)
        x = self.dropout(x)

        # Apply transformer blocks
        attention_weights = []
        for transformer_block in self.transformer_blocks:
            x, attn_weights = transformer_block(x, mask)
            attention_weights.append(attn_weights)

        x = self.layer_norm(x)

        # Global pooling and classification
        x = x.transpose(1, 2)  # (batch, d_model, seq_len)
        x = self.global_pool(x).squeeze(-1)  # (batch, d_model)

        output = self.classifier(x)

        return output, attention_weights


class TransformerDeepfakeDetector:
    """Transformer-based deepfake detector using attention mechanism."""

    def __init__(self, model_path=None, device=None):
        self.device = device or torch.device(
            "cuda" if torch.cuda.is_available() else "cpu",
        )

        # Load base wav2vec2 model for feature extraction
        self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
            model_path or "facebook/wav2vec2-base",
        )
        self.base_model = AutoModelForAudioClassification.from_pretrained(
            model_path or "facebook/wav2vec2-base",
            use_safetensors=True,
        ).to(self.device)

        # Initialise transformer model
        self.transformer_model = AudioTransformer(
            input_dim=1024,
            d_model=512,
            num_heads=8,
            num_layers=6,
            d_ff=2048,
            dropout=0.1,
            num_classes=2,
        ).to(self.device)

        # Load transformer weights if available
        if model_path and os.path.exists(
            os.path.join(model_path, "model.safetensors"),
        ):
            self.load_transformer_weights(model_path)

        self.transformer_model.eval()

        # Class labels
        self.id2label = {0: "real", 1: "fake"}
        self.label2id = {"real": 0, "fake": 1}

    def load_transformer_weights(self, model_path):
        """Load transformer weights from safetensors file."""
        try:
            safetensors_path = os.path.join(model_path, "model.safetensors")
            if os.path.exists(safetensors_path):
                state_dict = load_file(safetensors_path)

                transformer_weights = {
                    key.replace("transformer.", ""): value
                    for key, value in state_dict.items()
                    if "transformer" in key or "classifier" in key
                }

                if transformer_weights:
                    self.transformer_model.load_state_dict(
                        transformer_weights, strict=False,
                    )
                    logger.info(
                        "Loaded transformer weights from safetensors",
                    )
                else:
                    logger.warning(
                        "No transformer weights found in safetensors file",
                    )
            else:
                logger.warning(
                    "Safetensors file not found: %s", safetensors_path,
                )
        except Exception as exc:
            logger.error("Error loading transformer weights: %s", exc)

    def extract_features(self, audio_path):
        """Extract features from audio using Wav2Vec2."""
        try:
            waveform, _sample_rate = librosa.load(audio_path, sr=16000)
            waveform = waveform.astype(np.float32)

            inputs = self.feature_extractor(
                waveform, sampling_rate=16000, return_tensors="pt",
            )

            inputs = {
                key: val.to(self.device) for key, val in inputs.items()
            }

            with torch.no_grad():
                outputs = self.base_model.wav2vec2(
                    **inputs, output_hidden_states=True,
                )
                features = outputs.hidden_states[-1]

            return features

        except Exception as exc:
            logger.error("Error extracting features: %s", exc)
            return None

    def detect(self, audio_path, threshold=0.5):
        """
        Detect deepfake audio using transformer with attention.

        Args:
            audio_path (str): Path to audio file
            threshold (float): Classification threshold

        Returns:
            dict: Detection results with attention weights
        """
        try:
            features = self.extract_features(audio_path)
            if features is None:
                return {"error": "Failed to extract features"}

            with torch.no_grad():
                logits, attention_weights = self.transformer_model(features)

                # Confidence Calibration (Temperature Scaling)
                # Soften probability distribution to prevent overconfident boundary predictions
                temperature = 1.5
                scaled_logits = logits / temperature

                probabilities = F.softmax(scaled_logits, dim=1)
                predictions = torch.argmax(probabilities, dim=1)

                pred_idx = predictions[0].cpu().item()
                confidence = probabilities[0][pred_idx].cpu().item()
                all_probs = probabilities[0].cpu().numpy()

                avg_attention = (
                    torch.mean(attention_weights[-1], dim=1).cpu().numpy()
                )

                return {
                    "prediction": self.id2label[pred_idx],
                    "confidence": confidence,
                    "label_index": pred_idx,
                    "probabilities": {
                        self.id2label[i]: float(prob)
                        for i, prob in enumerate(all_probs)
                    },
                    "is_fake": pred_idx == 1,
                    "attention_weights": avg_attention.tolist(),
                    "model_type": "transformer_attention",
                }

        except Exception as exc:
            logger.error("Error in transformer detection: %s", exc)
            return {
                "error": str(exc),
                "prediction": "error",
                "confidence": 0.0,
                "is_fake": None,
                "model_type": "transformer_attention",
            }

    def get_attention_analysis(self, audio_path):
        """
        Get detailed attention analysis for visualisation.

        Args:
            audio_path (str): Path to audio file

        Returns:
            dict: Detailed attention analysis
        """
        try:
            features = self.extract_features(audio_path)
            if features is None:
                return {"error": "Failed to extract features"}

            with torch.no_grad():
                _logits, attention_weights = self.transformer_model(features)

                attention_analysis = {
                    "num_layers": len(attention_weights),
                    "num_heads": attention_weights[0].shape[1],
                    "sequence_length": attention_weights[0].shape[2],
                    "layer_attention": [],
                }

                for i, layer_attention in enumerate(attention_weights):
                    avg_layer_attention = (
                        torch.mean(layer_attention, dim=1).cpu().numpy()
                    )
                    attention_analysis["layer_attention"].append({
                        "layer": i + 1,
                        "attention_matrix": avg_layer_attention.tolist(),
                        "max_attention": float(
                            torch.max(layer_attention).cpu(),
                        ),
                        "min_attention": float(
                            torch.min(layer_attention).cpu(),
                        ),
                    })

                return attention_analysis

        except Exception as exc:
            logger.error("Error in attention analysis: %s", exc)
            return {"error": str(exc)}


def create_transformer_detector(model_path=None):
    """
    Create a transformer-based deepfake detector.

    Args:
        model_path (str): Path to model directory

    Returns:
        TransformerDeepfakeDetector: Initialised detector
    """
    return TransformerDeepfakeDetector(model_path)


def detect_with_transformer(audio_path, model_path=None):
    """
    Detect deepfake audio using transformer model.

    Args:
        audio_path (str): Path to audio file
        model_path (str): Path to model directory

    Returns:
        dict: Detection results
    """
    detector = create_transformer_detector(model_path)
    return detector.detect(audio_path)
