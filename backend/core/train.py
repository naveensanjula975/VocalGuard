"""
Model training pipeline.

Provides data preparation, model training, and metric visualisation
for the deepfake audio detection model.
"""

import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, TensorDataset

from core.augmentation import random_augment
from core.feature_extraction import extract_mel_spectrogram
from core.preprocessing import load_audio, preprocess_audio, split_into_segments
from logger import get_logger
from models.models import DeepFakeDetector

logger = get_logger(__name__)


def prepare_data(data_dir, max_files=None):
    """
    Prepare data for training from a data directory.

    Reads real and fake audio samples, extracts mel-spectrogram features,
    and returns them with binary labels (0 = real, 1 = fake).

    Args:
        data_dir (str): Path to the data directory
        max_files (int, optional): Maximum number of files per class

    Returns:
        tuple: (features, labels)
    """
    features = []
    labels = []

    for label, subdir in enumerate(("real", "fake")):
        dir_path = Path(data_dir) / subdir
        file_count = 0
        for filename in os.listdir(str(dir_path)):
            if max_files and file_count >= max_files:
                break

            if filename.endswith((".wav", ".mp3")):
                file_path = str(dir_path / filename)
                try:
                    y, sr = load_audio(file_path)
                    mel_spec = extract_mel_spectrogram(y, sr)
                    features.append(mel_spec)
                    labels.append(label)
                    file_count += 1
                except Exception as exc:
                    logger.warning(
                        "Error processing %s: %s", filename, exc,
                    )

    return np.array(features), np.array(labels)


def train_model(
    model, train_loader, val_loader, criterion, optimizer, num_epochs=10,
):
    """
    Train the model.

    Args:
        model: PyTorch model
        train_loader: Training data loader
        val_loader: Validation data loader
        criterion: Loss function
        optimizer: Optimiser
        num_epochs (int): Number of epochs to train for

    Returns:
        tuple: (trained model, training history)
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)

    history = {
        "train_loss": [],
        "val_loss": [],
        "train_acc": [],
        "val_acc": [],
    }

    for epoch in range(num_epochs):
        # Training phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0

        for inputs, batch_labels in train_loader:
            inputs, batch_labels = inputs.to(device), batch_labels.to(device)

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, batch_labels)
            loss.backward()
            optimizer.step()

            train_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            train_total += batch_labels.size(0)
            train_correct += (predicted == batch_labels).sum().item()

        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0

        with torch.no_grad():
            for inputs, batch_labels in val_loader:
                inputs = inputs.to(device)
                batch_labels = batch_labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, batch_labels)

                val_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                val_total += batch_labels.size(0)
                val_correct += (predicted == batch_labels).sum().item()

        # Save metrics
        train_loss /= len(train_loader)
        val_loss /= len(val_loader)
        train_acc = train_correct / train_total
        val_acc = val_correct / val_total

        history["train_loss"].append(train_loss)
        history["val_loss"].append(val_loss)
        history["train_acc"].append(train_acc)
        history["val_acc"].append(val_acc)

        logger.info(
            "Epoch %d/%d — Train Loss: %.4f, Val Loss: %.4f, "
            "Train Acc: %.4f, Val Acc: %.4f",
            epoch + 1, num_epochs, train_loss, val_loss, train_acc, val_acc,
        )

    return model, history


def save_training_metrics(history, save_dir):
    """
    Save training metrics as plots.

    Args:
        history (dict): Training history
        save_dir (str): Directory to save plots
    """
    os.makedirs(save_dir, exist_ok=True)

    # Loss curve
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(history["train_loss"], label="Train Loss")
    ax.plot(history["val_loss"], label="Validation Loss")
    ax.set_title("Loss Curve")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Loss")
    ax.legend()
    fig.savefig(os.path.join(save_dir, "loss_curve.png"))
    plt.close(fig)

    # Accuracy curve
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(history["train_acc"], label="Train Accuracy")
    ax.plot(history["val_acc"], label="Validation Accuracy")
    ax.set_title("Accuracy Curve")
    ax.set_xlabel("Epoch")
    ax.set_ylabel("Accuracy")
    ax.legend()
    fig.savefig(os.path.join(save_dir, "accuracy_curve.png"))
    plt.close(fig)


def run_training(
    data_dir, model_save_path, results_dir, batch_size=16, num_epochs=20,
):
    """
    Run the full training pipeline.

    Args:
        data_dir (str): Path to the data directory
        model_save_path (str): Path to save the trained model
        results_dir (str): Directory to save results
        batch_size (int): Batch size for training
        num_epochs (int): Number of epochs to train for
    """
    features, labels = prepare_data(data_dir)

    X_train, X_val, y_train, y_val = train_test_split(
        features, labels, test_size=0.2, random_state=42,
    )

    X_train = torch.tensor(X_train, dtype=torch.float32).unsqueeze(1)
    X_val = torch.tensor(X_val, dtype=torch.float32).unsqueeze(1)
    y_train = torch.tensor(y_train, dtype=torch.long)
    y_val = torch.tensor(y_val, dtype=torch.long)

    train_dataset = TensorDataset(X_train, y_train)
    val_dataset = TensorDataset(X_val, y_val)

    train_loader = DataLoader(
        train_dataset, batch_size=batch_size, shuffle=True,
    )
    val_loader = DataLoader(val_dataset, batch_size=batch_size)

    input_shape = X_train.shape[1:]
    model = DeepFakeDetector(input_shape)

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    trained_model, history = train_model(
        model, train_loader, val_loader, criterion, optimizer, num_epochs,
    )

    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    torch.save(trained_model.state_dict(), model_save_path)

    save_training_metrics(history, results_dir)

    logger.info("Training complete. Model saved to %s", model_save_path)


if __name__ == "__main__":
    _backend_dir = Path(__file__).resolve().parent.parent

    run_training(
        data_dir=str(_backend_dir / "data"),
        model_save_path=str(
            _backend_dir / "models" / "deepfake_detector.pth",
        ),
        results_dir=str(_backend_dir / "results"),
    )
