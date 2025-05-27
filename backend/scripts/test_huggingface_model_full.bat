@echo off
echo Running Hugging Face model test script...

cd %~dp0
python scripts/test_huggingface_model.py --verbose

echo.
echo Test completed. Press any key to exit.
pause > nul
