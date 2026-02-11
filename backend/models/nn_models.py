"""
PyTorch neural network definitions.

These are ML model architectures — no Pydantic schemas or API
concerns belong here.
"""

import torch
import torch.nn as nn


class DeepFakeDetector(nn.Module):
    """
    Feed-forward neural network for deepfake audio detection.

    Takes concatenated audio features as input and outputs a probability
    of the audio being fake.  Supports both traditional features and
    Wav2Vec2 embeddings.

    Default input size: 768 (Wav2Vec2) + 80 (MFCC mean & var) + 3 (spectral) = 851
    """

    def __init__(self, input_features: int = 851, hidden_dim: int = 128):
        super().__init__()
        self.model = nn.Sequential(
            nn.Linear(input_features, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.Dropout(0.3),
            nn.Linear(hidden_dim // 2, hidden_dim // 4),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 4),
            nn.Dropout(0.2),
            nn.Linear(hidden_dim // 4, 1),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)
