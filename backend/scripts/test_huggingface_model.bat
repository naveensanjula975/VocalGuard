@echo off
echo ===================================
echo Testing Wav2Vec2 Safetensors Model
echo ===================================
echo.

cd %~dp0
python -m scripts.test_huggingface_model

echo.
echo Test completed.
pause
