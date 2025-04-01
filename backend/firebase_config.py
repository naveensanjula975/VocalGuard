import firebase_admin
from firebase_admin import credentials, auth
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the current directory
current_dir = Path(__file__).parent

def initialize_firebase():
    try:
        # Check if the app is already initialized
        firebase_admin.get_app()
    except ValueError:
        # Initialize only if not already initialized
        try:
            service_account_path = current_dir / "serviceAccountKey.json"
            if not service_account_path.exists():
                raise FileNotFoundError("serviceAccountKey.json not found")
            
            cred = credentials.Certificate(str(service_account_path))
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully")
        except Exception as e:
            print(f"Firebase initialization error: {e}")
            raise

initialize_firebase()