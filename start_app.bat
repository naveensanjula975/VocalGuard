@echo off
echo ===================================
echo VocalGuard Environment Check
echo ===================================

cd backend
if not exist .env (
    echo WARNING: No .env file found!
    echo Creating a default .env file from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: The generated .env file contains placeholder values.
    echo Please edit the .env file with your actual Firebase credentials.
    echo.
    pause
)

echo Starting VocalGuard Application...
echo.
echo Press Ctrl+C to stop both servers
echo.

start cmd /k "cd backend && run_server.bat"
timeout /t 2 > nul
start cmd /k "cd frontend && npm run dev"
echo.
echo Both servers started successfully!
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo.
pause
