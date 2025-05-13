"""
Test script to verify Firebase configuration
"""
import os
import sys
from pathlib import Path

# Add parent directory to system path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def test_firebase_config():
    try:
        from services.firebase_config import initialize_firebase
        print("Successfully imported firebase_config")
        
        # Try to initialize Firebase
        initialize_firebase()
        print("Successfully initialized Firebase")
        
        # Try to import Firebase admin
        from firebase_admin import auth
        print("Successfully imported firebase_admin.auth")
        
        # Try to get a list of users (just to test the connection)
        try:
            page = auth.list_users()
            print(f"Successfully connected to Firebase Auth. User count: {len(list(page.iterate_all()))}")
        except Exception as e:
            print(f"Error listing users: {e}")
        
        return True
    except Exception as e:
        print(f"Error testing Firebase configuration: {e}")
        return False

if __name__ == "__main__":
    print("Starting Firebase configuration test...")
    success = test_firebase_config()
    print(f"Firebase test completed. Success: {success}")
