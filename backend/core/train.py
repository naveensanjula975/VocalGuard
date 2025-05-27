# Model training script
import os
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split

# Import local modules
from models.models import DeepFakeDetector
from core.preprocessing import load_audio, preprocess_audio, split_into_segments
from core.feature_extraction import extract_mel_spectrogram
from core.augmentation import random_augment

def prepare_data(data_dir, max_files=None):
    """
    Prepare data for training from data directory
    
    Args:
        data_dir (str): Path to the data directory
        max_files (int, optional): Maximum number of files to process
        
    Returns:
        tuple: (features, labels)
    """
    features = []
    labels = []
    
    # Process real samples
    real_dir = os.path.join(data_dir, 'real')
    file_count = 0
    for filename in os.listdir(real_dir):
        if max_files and file_count >= max_files:
            break
            
        if filename.endswith(('.wav', '.mp3')):
            file_path = os.path.join(real_dir, filename)
            try:
                y, sr = load_audio(file_path)
                mel_spec = extract_mel_spectrogram(y, sr)
                features.append(mel_spec)
                labels.append(0)  # 0 for real
                file_count += 1
            except Exception as e:
                print(f"Error processing {filename}: {e}")
    
    # Process fake samples
    fake_dir = os.path.join(data_dir, 'fake')
    file_count = 0
    for filename in os.listdir(fake_dir):
        if max_files and file_count >= max_files:
            break
            
        if filename.endswith(('.wav', '.mp3')):
            file_path = os.path.join(fake_dir, filename)
            try:
                y, sr = load_audio(file_path)
                mel_spec = extract_mel_spectrogram(y, sr)
                features.append(mel_spec)
                labels.append(1)  # 1 for fake
                file_count += 1
            except Exception as e:
                print(f"Error processing {filename}: {e}")
    
    return np.array(features), np.array(labels)

def train_model(model, train_loader, val_loader, criterion, optimizer, num_epochs=10):
    """
    Train the model
    
    Args:
        model: PyTorch model
        train_loader: Training data loader
        val_loader: Validation data loader
        criterion: Loss function
        optimizer: Optimizer
        num_epochs (int): Number of epochs to train for
        
    Returns:
        tuple: (trained model, training history)
    """
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = model.to(device)
    
    history = {
        'train_loss': [],
        'val_loss': [],
        'train_acc': [],
        'val_acc': []
    }
    
    for epoch in range(num_epochs):
        # Training phase
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for inputs, labels in train_loader:
            inputs, labels = inputs.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
        
        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        # Save metrics
        train_loss /= len(train_loader)
        val_loss /= len(val_loader)
        train_acc = train_correct / train_total
        val_acc = val_correct / val_total
        
        history['train_loss'].append(train_loss)
        history['val_loss'].append(val_loss)
        history['train_acc'].append(train_acc)
        history['val_acc'].append(val_acc)
        
        print(f"Epoch {epoch+1}/{num_epochs}, "
              f"Train Loss: {train_loss:.4f}, "
              f"Val Loss: {val_loss:.4f}, "
              f"Train Acc: {train_acc:.4f}, "
              f"Val Acc: {val_acc:.4f}")
    
    return model, history

def save_training_metrics(history, save_dir):
    """
    Save training metrics as plots
    
    Args:
        history (dict): Training history
        save_dir (str): Directory to save plots
    """
    # Create directory if it doesn't exist
    os.makedirs(save_dir, exist_ok=True)
    
    # Plot loss curve
    plt.figure(figsize=(10, 5))
    plt.plot(history['train_loss'], label='Train Loss')
    plt.plot(history['val_loss'], label='Validation Loss')
    plt.title('Loss Curve')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()
    plt.savefig(os.path.join(save_dir, 'loss_curve.png'))
    
    # Plot accuracy curve
    plt.figure(figsize=(10, 5))
    plt.plot(history['train_acc'], label='Train Accuracy')
    plt.plot(history['val_acc'], label='Validation Accuracy')
    plt.title('Accuracy Curve')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.savefig(os.path.join(save_dir, 'accuracy_curve.png'))

def run_training(data_dir, model_save_path, results_dir, batch_size=16, num_epochs=20):
    """
    Run the full training pipeline
    
    Args:
        data_dir (str): Path to the data directory
        model_save_path (str): Path to save the trained model
        results_dir (str): Directory to save results
        batch_size (int): Batch size for training
        num_epochs (int): Number of epochs to train for
    """
    # Prepare data
    features, labels = prepare_data(data_dir)
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(features, labels, test_size=0.2, random_state=42)
    
    # Convert to PyTorch tensors
    X_train = torch.tensor(X_train, dtype=torch.float32).unsqueeze(1)  # Add channel dimension
    X_val = torch.tensor(X_val, dtype=torch.float32).unsqueeze(1)
    y_train = torch.tensor(y_train, dtype=torch.long)
    y_val = torch.tensor(y_val, dtype=torch.long)
    
    # Create data loaders
    train_dataset = TensorDataset(X_train, y_train)
    val_dataset = TensorDataset(X_val, y_val)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)
    
    # Initialize model
    input_shape = X_train.shape[1:]  # (channels, height, width)
    model = DeepFakeDetector(input_shape)
    
    # Define loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    
    # Train model
    trained_model, history = train_model(model, train_loader, val_loader, criterion, optimizer, num_epochs)
    
    # Save model
    os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
    torch.save(trained_model.state_dict(), model_save_path)
    
    # Save training metrics
    save_training_metrics(history, results_dir)
    
    print(f"Training complete. Model saved to {model_save_path}")

if __name__ == "__main__":
    # Example usage
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    model_save_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "deepfake_detector.pth")
    results_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "results")
    
    run_training(data_dir, model_save_path, results_dir)
