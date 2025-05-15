@echo off
REM This script starts both the backend and frontend for testing
echo Starting VocalGuard backend and frontend...

REM Start backend in a new window
start cmd /k "cd e:\Github\git\capstone project\v3\VocalGuard\backend && python main.py"

REM Wait a moment for backend to initialize
timeout /t 5

REM Start frontend in a new window
start cmd /k "cd e:\Github\git\capstone project\v3\VocalGuard\frontend && npm run dev"

echo Both backend and frontend are now running.
echo Backend: http://localhost:8000
echo Frontend: Check console for URL (typically http://localhost:5173)
