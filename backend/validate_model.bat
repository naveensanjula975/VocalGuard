@echo off
echo Validating Wav2Vec2 Model Setup...

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Change to the script directory
cd %SCRIPT_DIR%

python scripts/validate_model.py

echo.
echo Validation completed.
echo.

echo Press any key to exit...
pause > nul
