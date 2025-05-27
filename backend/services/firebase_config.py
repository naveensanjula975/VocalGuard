import firebase_admin
from firebase_admin import credentials, auth, firestore
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
            # Try multiple locations for serviceAccountKey.json
            base_path = Path(os.path.dirname(os.path.dirname(__file__)))
            possible_paths = [
                base_path / "config" / "serviceAccountKey.json", 
                base_path / "serviceAccountKey.json",        
            ]
            service_account_path = None
            for path in possible_paths:
                if path.exists():
                    service_account_path = path
                    break
            
            if service_account_path is None:
                raise FileNotFoundError(f"serviceAccountKey.json not found in any of the expected locations")
            
            # Initialize Firebase app with Firestore
            cred = credentials.Certificate(str(service_account_path))
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully with Firestore")
        except Exception as e:
            print(f"Firebase initialization error: {e}")
            raise

initialize_firebase()