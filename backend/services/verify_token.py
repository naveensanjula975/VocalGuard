"""
Script to test token verification with Firebase
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to system path
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

# Load .env file
load_dotenv()

def test_token_verification():
    try:
        from services.firebase_config import initialize_firebase
        print("Successfully imported firebase_config")
        
        # Initialize Firebase
        initialize_firebase()
        print("Successfully initialized Firebase")
        
        # Import Firebase auth
        from firebase_admin import auth
        print("Successfully imported firebase_admin.auth")
        
        # Ask for token to verify
        token = input("Enter Firebase ID token to verify (or press Enter to skip): ")
        if not token:
            print("Skipping token verification test")
            return True
            
        try:
            # Verify the token
            print("Verifying token...")
            decoded_token = auth.verify_id_token(token)
            print("Token verification successful!")
            print(f"User ID from token: {decoded_token.get('uid')}")
            print(f"Email: {decoded_token.get('email')}")
            print(f"Issued at: {decoded_token.get('iat')}")
            print(f"Expiration: {decoded_token.get('exp')}")
            return True
        except Exception as e:
            print(f"Token verification error: {e}")
            return False
    
    except Exception as e:
        print(f"Error setting up token verification: {e}")
        return False

if __name__ == "__main__":
    print("Starting Firebase Token verification test...")
    success = test_token_verification()
    print(f"Firebase Token verification test completed. Success: {success}")
