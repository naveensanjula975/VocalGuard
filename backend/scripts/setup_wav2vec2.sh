#!/bin/bash

echo "==================================="
echo "VocalGuard Wav2Vec2 Setup"
echo "==================================="
echo "This script will install the required dependencies for the Wav2Vec2 model."
echo

# Check Python installation
echo "Checking Python installation..."
if command -v python3 &>/dev/null; then
    python_cmd="python3"
elif command -v python &>/dev/null; then
    python_cmd="python"
else
    echo "ERROR: Python is not installed."
    echo "Please install Python 3.8 or higher and try again."
    exit 1
fi

$python_cmd --version
if [ $? -ne 0 ]; then
    echo "ERROR: Python is not installed properly."
    echo "Please install Python 3.8 or higher and try again."
    exit 1
fi

# Check pip installation
echo
echo "Checking pip installation..."
if command -v pip3 &>/dev/null; then
    pip_cmd="pip3"
elif command -v pip &>/dev/null; then
    pip_cmd="pip"
else
    echo "ERROR: pip is not installed."
    echo "Please install pip and try again."
    exit 1
fi

$pip_cmd --version
if [ $? -ne 0 ]; then
    echo "ERROR: pip is not installed properly."
    echo "Please install pip and try again."
    exit 1
fi

# Install required packages
echo
echo "Installing required packages..."
$pip_cmd install -r requirements.txt
$pip_cmd install torch==2.0.1 transformers==4.31.0 matplotlib==3.7.2 numpy==1.24.3

# Download and cache Wav2Vec2 model
echo
echo "Downloading and caching Wav2Vec2 model..."
$python_cmd -c "from transformers import Wav2Vec2Processor, Wav2Vec2Model; print('Downloading Wav2Vec2 model...'); Wav2Vec2Processor.from_pretrained('facebook/wav2vec2-base'); Wav2Vec2Model.from_pretrained('facebook/wav2vec2-base'); print('Wav2Vec2 model downloaded successfully!')"

# Test Wav2Vec2 feature extraction
echo
echo "Testing Wav2Vec2 feature extraction..."
$python_cmd scripts/test_wav2vec2.py

echo
echo "==================================="
echo "Setup Complete!"
echo "If all tests passed, you're ready to use Wav2Vec2 for deepfake detection."
echo "==================================="
