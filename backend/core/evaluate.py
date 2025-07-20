# Model evaluation script
import os
import numpy as np
import torch
import matplotlib.pyplot as plt
from sklearn.metrics import confusion_matrix, roc_curve, auc, precision_recall_curve
from torch.utils.data import DataLoader, TensorDataset

# Import local modules
from models.models import DeepFakeDetector
from core.preprocessing import load_audio, preprocess_audio, split_into_segments
from core.feature_extraction import extract_mel_spectrogram

def load_model(model_path, input_shape):
    """
    Load a trained model
    
    Args:
        model_path (str): Path to the model weights
        input_shape (tuple): Input shape for the model (channels, height, width)
        
    Returns:
        model: Loaded PyTorch model
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = DeepFakeDetector(input_shape)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model = model.to(device)
    model.eval()
    
    return model

def evaluate_model(model, test_loader):
    """
    Evaluate the model on test data
    
    Args:
        model: PyTorch model
        test_loader: Test data loader
        
    Returns:
        tuple: (predictions, true_labels, probabilities)
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    model.eval()
    
    all_preds = []
    all_labels = []
    all_probs = []
    
    with torch.no_grad():
        for inputs, labels in test_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            probs = torch.softmax(outputs, dim=1)
            
            _, preds = torch.max(outputs, 1)
            
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs[:, 1].cpu().numpy())  # Probability of the "fake" class
    
    return np.array(all_preds), np.array(all_labels), np.array(all_probs)

def plot_confusion_matrix(y_true, y_pred, save_path):
    """
    Plot confusion matrix
    
    Args:
        y_true (np.ndarray): True labels
        y_pred (np.ndarray): Predicted labels
        save_path (str): Path to save the plot
    """
    cm = confusion_matrix(y_true, y_pred)
    
    plt.figure(figsize=(8, 6))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix')
    plt.colorbar()
    
    classes = ['Real', 'Fake']
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes)
    plt.yticks(tick_marks, classes)
    
    # Add text annotations
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, format(cm[i, j], 'd'),
                     horizontalalignment="center",
                     color="white" if cm[i, j] > thresh else "black")
    
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(save_path)

def plot_roc_curve(y_true, y_score, save_path):
    """
    Plot ROC curve
    
    Args:
        y_true (np.ndarray): True labels
        y_score (np.ndarray): Prediction scores (probabilities)
        save_path (str): Path to save the plot
    """
    fpr, tpr, _ = roc_curve(y_true, y_score)
    roc_auc = auc(fpr, tpr)
    
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (AUC = {roc_auc:.2f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Receiver Operating Characteristic (ROC) Curve')
    plt.legend(loc="lower right")
    plt.savefig(save_path)

def plot_precision_recall_curve(y_true, y_score, save_path):
    """
    Plot precision-recall curve
    
    Args:
        y_true (np.ndarray): True labels
        y_score (np.ndarray): Prediction scores (probabilities)
        save_path (str): Path to save the plot
    """
    precision, recall, _ = precision_recall_curve(y_true, y_score)
    
    plt.figure(figsize=(8, 6))
    plt.plot(recall, precision, color='blue', lw=2)
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.ylim([0.0, 1.05])
    plt.xlim([0.0, 1.0])
    plt.title('Precision-Recall Curve')
    plt.savefig(save_path)

def run_evaluation(test_data, model_path, results_dir, batch_size=16):
    """
    Run the full evaluation pipeline
    
    Args:
        test_data (tuple): (X_test, y_test) tuple
        model_path (str): Path to the trained model
        results_dir (str): Directory to save results
        batch_size (int): Batch size for evaluation
    """
    X_test, y_test = test_data
    
    # Convert to PyTorch tensors
    X_test = torch.tensor(X_test, dtype=torch.float32).unsqueeze(1)  # Add channel dimension
    y_test = torch.tensor(y_test, dtype=torch.long)
    
    # Create data loader
    test_dataset = TensorDataset(X_test, y_test)
    test_loader = DataLoader(test_dataset, batch_size=batch_size)
    
    # Load model
    input_shape = X_test.shape[1:]  # (channels, height, width)
    model = load_model(model_path, input_shape)
    
    # Evaluate model
    preds, true_labels, probs = evaluate_model(model, test_loader)
    
    # Create results directory if it doesn't exist
    os.makedirs(results_dir, exist_ok=True)
    
    # Plot and save results
    plot_confusion_matrix(true_labels, preds, os.path.join(results_dir, 'confusion_matrix.png'))
    plot_roc_curve(true_labels, probs, os.path.join(results_dir, 'roc_curve.png'))
    plot_precision_recall_curve(true_labels, probs, os.path.join(results_dir, 'precision_recall_curve.png'))
    
    print(f"Evaluation complete. Results saved to {results_dir}")

if __name__ == "__main__":
    # This would typically be imported from a separate data preparation script
    # For this example, we'll just use random data
    X_test = np.random.rand(100, 128, 128)
    y_test = np.random.randint(0, 2, 100)
    
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "deepfake_detector.pth")
    results_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "results")
    
    run_evaluation((X_test, y_test), model_path, results_dir)
