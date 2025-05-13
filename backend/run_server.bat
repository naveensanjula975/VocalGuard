@echo off
echo Starting VocalGuard backend server...

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
