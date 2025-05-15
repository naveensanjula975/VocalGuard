@echo off
REM This script starts both the backend and frontend for testing
echo ===================================
echo VocalGuard Application Launcher
echo ===================================

REM Check for environment file
if not exist backend\.env (
    echo WARNING: No .env file found in backend directory!
    echo Creating a default .env file from template...
    copy backend\.env.example backend\.env
    echo.
    echo IMPORTANT: The generated .env file contains placeholder values.
    echo Please edit the backend/.env file with your actual Firebase credentials.
    echo Press any key to continue anyway...
    pause > nul
)

echo Starting VocalGuard backend and frontend...

REM Start backend in a new window
start cmd /k "cd backend && python main.py"

REM Wait a moment for backend to initialize
timeout /t 5

REM Start frontend in a new window
start cmd /k "cd e:\Github\git\capstone project\v3\VocalGuard\frontend && npm run dev"

echo Both backend and frontend are now running.
echo Backend: http://localhost:8000
echo Frontend: Check console for URL (typically http://localhost:5173)
