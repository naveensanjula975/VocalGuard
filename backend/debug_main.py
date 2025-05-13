"""
Debug main app startup
"""
import os
import sys
from pathlib import Path

# Set the Firebase API key environment variable
os.environ["FIREBASE_WEB_API_KEY"] = "AIzaSyC6pu-kOErLCc78FF4ya5KW0471gsTOGc0"

try:
    print("Importing main app...")
    import main
    print("Import successful!")
    
    print("Attributes of main:")
    for attr in dir(main):
        if not attr.startswith("__"):
            print(f"  {attr}")
    
    print("Main app is ready to run.")
    
except Exception as e:
    print(f"Error importing main app: {e}")
    import traceback
    traceback.print_exc()
