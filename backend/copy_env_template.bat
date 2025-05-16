@echo off
echo ===================================
echo VocalGuard Environment Setup
echo ===================================

if exist .env (
    echo .env file already exists.
    echo.
    echo Options:
    echo 1. Keep existing .env file
    echo 2. Replace with template (you will need to update credentials)
    echo 3. View current .env file
    echo.
    
    set /p choice="Enter your choice (1-3): "
    
    if "%choice%"=="2" (
        echo.
        echo Creating new .env file from template...
        copy .env.example .env
        echo.
        echo New .env file created. Please update it with your Firebase credentials.
    ) else if "%choice%"=="3" (
        echo.
        echo Current .env file contents:
        echo -------------------------------
        type .env
        echo -------------------------------
        echo.
        pause
    ) else (
        echo.
        echo Keeping existing .env file.
    )
) else (
    echo No .env file found.
    echo.
    echo Creating .env file from template...
    copy .env.example .env
    
    echo.
    echo .env file has been created from the template.
    echo.
    echo IMPORTANT: Please edit the .env file with your Firebase credentials.
    echo You can find these in your Firebase project console.
)

if exist .env.actual (
    echo.
    echo Note: A backup of your previous configuration exists in .env.actual
    echo You may want to compare the files and copy any important settings.
)

echo.
echo FIREBASE CREDENTIALS CHECK:

REM Check for serviceAccountKey.json
set "SERVICE_ACCOUNT_FOUND="
if exist config\serviceAccountKey.json (
    echo [✓] Found serviceAccountKey.json in config/ directory.
    set "SERVICE_ACCOUNT_FOUND=1"
) else if exist serviceAccountKey.json (
    echo [✓] Found serviceAccountKey.json in current directory.
    set "SERVICE_ACCOUNT_FOUND=1"
) else (
    echo [!] WARNING: serviceAccountKey.json not found in any expected location.
    echo     You need to download this file from your Firebase project console:
    echo     Project settings ^> Service accounts ^> Firebase Admin SDK ^> Generate new private key
    echo     Place the downloaded file in one of these locations:
    echo     - backend/config/serviceAccountKey.json
    echo     - or backend/serviceAccountKey.json
)

echo.
echo IMPORTANT: Never commit your .env file or serviceAccountKey.json to version control.
pause
