@echo off
echo Audio Preprocessing Tool for Wav2Vec2 Model
echo ==========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Set default directories
set DATA_DIR=%SCRIPT_DIR%\data
set INPUT_DIR=%DATA_DIR%\input
set OUTPUT_DIR=%DATA_DIR%\processed

REM Create directories if they don't exist
if not exist "%INPUT_DIR%" mkdir "%INPUT_DIR%"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo Please place your audio files in: %INPUT_DIR%
echo Processed files will be saved to: %OUTPUT_DIR%
echo.
echo 1. Process files in the input directory
echo 2. Process a single file
echo 3. Cancel
echo.

set /p CHOICE="Enter your choice (1-3): "

if "%CHOICE%"=="1" (
    echo.
    echo Processing all files in %INPUT_DIR%...
    python %SCRIPT_DIR%\scripts\preprocess_audio.py --input-dir "%INPUT_DIR%" --output-dir "%OUTPUT_DIR%"
) else if "%CHOICE%"=="2" (
    echo.
    set /p FILE_PATH="Enter the full path to the audio file: "
    echo Processing file: %FILE_PATH%
    python %SCRIPT_DIR%\scripts\preprocess_audio.py --file "%FILE_PATH%" --output-dir "%OUTPUT_DIR%"
) else if "%CHOICE%"=="3" (
    echo Operation cancelled.
    goto end
) else (
    echo Invalid choice. Please run the script again.
    goto end
)

echo.
echo Processing complete!
echo Processed files are available in: %OUTPUT_DIR%
echo.

:end
echo Press any key to exit...
pause > nul
