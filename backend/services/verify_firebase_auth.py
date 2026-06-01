"""
Test script to verify Firebase Authentication configuration
"""
import os
import sys
import json
import requests
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to system path
current_dir = Path(__file__).parent
parent_dir = current_dir.parent
sys.path.insert(0, str(parent_dir))

# Load .env file
load_dotenv()

def test_firebase_auth():
    try:
        from services.firebase_config import initialize_firebase
        print("Successfully imported firebase_config")
        
        # Try to initialize Firebase
        initialize_firebase()
        print("Successfully initialized Firebase")
        
        # Try to import Firebase admin
        from firebase_admin import auth
        print("Successfully imported firebase_admin.auth")
        
        # Get Firebase Web API Key
        FIREBASE_WEB_API_KEY = os.getenv("FIREBASE_WEB_API_KEY")
        if not FIREBASE_WEB_API_KEY:
            print("ERROR: FIREBASE_WEB_API_KEY environment variable is not set!")
            return False
            
        print(f"FIREBASE_WEB_API_KEY is set (value hidden for security)")
        
        # Test login with test credentials
        # Only do this if you provide test credentials
        test_email = input("Enter test email (or press Enter to skip): ")
        if test_email:
            test_password = input("Enter test password: ")
            
            # Firebase Auth REST API endpoint for email/password sign-in
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
            
            # Request body
            payload = {
                "email": test_email,
                "password": test_password,
                "returnSecureToken": True
            }
            
            print("Testing login with Firebase Auth REST API...")
            # Make request to Firebase Auth
            response = requests.post(url, data=json.dumps(payload))
            firebase_response = response.json()
            
            # Check for errors in the response
            if "error" in firebase_response:
                error_message = firebase_response["error"]["message"]
                print(f"Firebase auth error: {error_message}")
                return False
                
            print("Login successful!")
            print(f"User ID: {firebase_response.get('localId')}")
            print("Token received (token hidden for security)")
            
            # Test getting user by email 
            print("Testing auth.get_user_by_email()...")
            try:
                user = auth.get_user_by_email(test_email)
                print(f"Successfully retrieved user data. Display name: {user.display_name}")
            except Exception as e:
                print(f"Error retrieving user by email: {e}")
                return False
        
        return True
    except Exception as e:
        print(f"Error testing Firebase authentication: {e}")
        return False

if __name__ == "__main__":
    print("Starting Firebase Authentication test...")
    success = test_firebase_auth()
    print(f"Firebase Authentication test completed. Success: {success}")
