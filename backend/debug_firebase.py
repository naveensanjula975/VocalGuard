"""
Simple test script to debug Firebase import issues
"""
import os
import sys
from pathlib import Path

# Print Python version and path information
print(f"Python version: {sys.version}")
print(f"Script location: {__file__}")
print(f"Current working directory: {os.getcwd()}")
print(f"Path: {sys.path}")

# Add the current directory to system path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
print(f"Updated path: {sys.path}")

print("Testing Firebase imports...")

try:
    print("Importing firebase_config...")
    from services.firebase_config import initialize_firebase
    print("Import successful!")
    
    print("Initializing Firebase...")
    initialize_firebase()
    print("Initialization successful!")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
