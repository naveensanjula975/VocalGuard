@echo off
echo Running Enhanced Hugging Face Model Tests...
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Change to the script directory
cd %SCRIPT_DIR%

REM Set paths for output files
set JSON_OUTPUT=%SCRIPT_DIR%\data\test_results.json
set CHART_OUTPUT=%SCRIPT_DIR%\data\test_visualization.png

REM Run the enhanced test script with output files
python scripts/test_huggingface_model_enhanced.py --verbose --output-json %JSON_OUTPUT% --output-chart %CHART_OUTPUT%

echo.
echo Test completed.
echo JSON Results saved to: %JSON_OUTPUT%
echo Chart saved to: %CHART_OUTPUT%
echo.

echo Press any key to exit...
pause > nul
