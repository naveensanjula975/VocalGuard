"""
Model evaluation pipeline.

Provides evaluation, metric computation, and visualisation (confusion
matrix, ROC curve, precision-recall curve) for the deepfake detector.
"""

import os
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import torch
from sklearn.metrics import auc, confusion_matrix, precision_recall_curve, roc_curve
from torch.utils.data import DataLoader, TensorDataset

from core.feature_extraction import extract_mel_spectrogram
from core.preprocessing import load_audio, preprocess_audio, split_into_segments
from logger import get_logger
from models.models import DeepFakeDetector

logger = get_logger(__name__)


def load_model(model_path, input_shape):
    """
    Load a trained model.

    Args:
        model_path (str): Path to the model weights
        input_shape (tuple): Input shape (channels, height, width)

    Returns:
        model: Loaded PyTorch model
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = DeepFakeDetector(input_shape)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model = model.to(device)
    model.eval()
    return model


def evaluate_model(model, test_loader):
    """
    Evaluate the model on test data.

    Args:
        model: PyTorch model
        test_loader: Test data loader

    Returns:
        tuple: (predictions, true_labels, probabilities)
    """
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    model.eval()

    all_preds = []
    all_labels = []
    all_probs = []

    with torch.no_grad():
        for inputs, batch_labels in test_loader:
            inputs = inputs.to(device)
            batch_labels = batch_labels.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)

            _, preds = torch.max(outputs, 1)

            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(batch_labels.cpu().numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())

    return np.array(all_preds), np.array(all_labels), np.array(all_probs)


def plot_confusion_matrix(y_true, y_pred, save_path):
    """
    Plot and save a confusion matrix.

    Args:
        y_true (np.ndarray): True labels
        y_pred (np.ndarray): Predicted labels
        save_path (str): Path to save the plot
    """
    cm = confusion_matrix(y_true, y_pred)

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax.set_title("Confusion Matrix")
    fig.colorbar(ax.images[0], ax=ax)

    classes = ["Real", "Fake"]
    tick_marks = np.arange(len(classes))
    ax.set_xticks(tick_marks)
    ax.set_xticklabels(classes)
    ax.set_yticks(tick_marks)
    ax.set_yticklabels(classes)

    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                j, i, format(cm[i, j], "d"),
                horizontalalignment="center",
                color="white" if cm[i, j] > thresh else "black",
            )

    ax.set_ylabel("True Label")
    ax.set_xlabel("Predicted Label")
    fig.tight_layout()
    fig.savefig(save_path)
    plt.close(fig)


def plot_roc_curve(y_true, y_score, save_path):
    """
    Plot and save an ROC curve.

    Args:
        y_true (np.ndarray): True labels
        y_score (np.ndarray): Prediction scores (probabilities)
        save_path (str): Path to save the plot
    """
    fpr, tpr, _ = roc_curve(y_true, y_score)
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(
        fpr, tpr, color="darkorange", lw=2,
        label=f"ROC curve (AUC = {roc_auc:.2f})",
    )
    ax.plot([0, 1], [0, 1], color="navy", lw=2, linestyle="--")
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.set_title("Receiver Operating Characteristic (ROC) Curve")
    ax.legend(loc="lower right")
    fig.savefig(save_path)
    plt.close(fig)


def plot_precision_recall_curve(y_true, y_score, save_path):
    """
    Plot and save a precision-recall curve.

    Args:
        y_true (np.ndarray): True labels
        y_score (np.ndarray): Prediction scores (probabilities)
        save_path (str): Path to save the plot
    """
    precision, recall, _ = precision_recall_curve(y_true, y_score)

    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot(recall, precision, color="blue", lw=2)
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_ylim([0.0, 1.05])
    ax.set_xlim([0.0, 1.0])
    ax.set_title("Precision-Recall Curve")
    fig.savefig(save_path)
    plt.close(fig)


def run_evaluation(test_data, model_path, results_dir, batch_size=16):
    """
    Run the full evaluation pipeline.

    Args:
        test_data (tuple): (X_test, y_test) tuple
        model_path (str): Path to the trained model
        results_dir (str): Directory to save results
        batch_size (int): Batch size for evaluation
    """
    X_test, y_test = test_data

    X_test = torch.tensor(X_test, dtype=torch.float32).unsqueeze(1)
    y_test = torch.tensor(y_test, dtype=torch.long)

    test_dataset = TensorDataset(X_test, y_test)
    test_loader = DataLoader(test_dataset, batch_size=batch_size)

    input_shape = X_test.shape[1:]
    model = load_model(model_path, input_shape)

    preds, true_labels, probs = evaluate_model(model, test_loader)

    os.makedirs(results_dir, exist_ok=True)

    plot_confusion_matrix(
        true_labels, preds,
        os.path.join(results_dir, "confusion_matrix.png"),
    )
    plot_roc_curve(
        true_labels, probs,
        os.path.join(results_dir, "roc_curve.png"),
    )
    plot_precision_recall_curve(
        true_labels, probs,
        os.path.join(results_dir, "precision_recall_curve.png"),
    )

    logger.info("Evaluation complete. Results saved to %s", results_dir)


if __name__ == "__main__":
    X_test = np.random.rand(100, 128, 128)
    y_test = np.random.randint(0, 2, 100)

    _backend_dir = Path(__file__).resolve().parent.parent

    run_evaluation(
        (X_test, y_test),
        model_path=str(
            _backend_dir / "models" / "deepfake_detector.pth",
        ),
        results_dir=str(_backend_dir / "results"),
    )
