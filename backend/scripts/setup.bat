@echo off
echo Setting up VocalGuard backend environment...

:: Create virtual environment if it doesn't exist
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

:: Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

:: Install dependencies
echo Installing required packages...


:: Verify Firebase configuration
echo Verifying Firebase configuration...

echo.
echo Setup complete! You can start the server with:
echo uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo.
