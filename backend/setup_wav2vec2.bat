@echo off
echo ===================================
echo VocalGuard Wav2Vec2 Setup
echo ===================================
echo This script will install the required dependencies for the Wav2Vec2 model.

echo.
echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH.
    echo Please install Python 3.8 or higher and try again.
    exit /b 1
)

echo.
echo Checking pip installation...
pip --version
if %errorlevel% neq 0 (
    echo ERROR: pip is not installed or not in PATH.
    echo Please install pip and try again.
    exit /b 1
)

echo.
echo Installing required packages...
pip install -r requirements.txt
pip install torch==2.0.1 transformers==4.31.0 matplotlib==3.7.2 numpy==1.24.3

echo.
echo Downloading and caching Wav2Vec2 model...
python -c "from transformers import Wav2Vec2Processor, Wav2Vec2Model; print('Downloading Wav2Vec2 model...'); Wav2Vec2Processor.from_pretrained('facebook/wav2vec2-base'); Wav2Vec2Model.from_pretrained('facebook/wav2vec2-base'); print('Wav2Vec2 model downloaded successfully!')"

echo.
echo Testing Wav2Vec2 feature extraction...
python scripts/test_wav2vec2.py

echo.
echo ===================================
echo Setup Complete!
echo If all tests passed, you're ready to use Wav2Vec2 for deepfake detection.
echo ===================================
