@echo off
echo Activating virtual environment...
call .\venv\Scripts\activate

echo ======================================
echo Firebase Web API Key Configuration
echo ======================================
set FIREBASE_WEB_API_KEY=AIzaSyC6pu-kOErLCc78FF4ya5KW0471gsTOGc0
echo Using Firebase Web API Key: %FIREBASE_WEB_API_KEY%

echo Testing Firebase configuration...
python test_firebase.py

echo Starting server...
uvicorn main:app --reload --host 0.0.0.0 --port 8000
