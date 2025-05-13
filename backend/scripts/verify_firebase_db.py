#!/usr/bin/env python
# coding: utf-8

"""
Verify Firebase Realtime Database connection and initialization.
"""

import os
import sys
from pathlib import Path

# Add the parent directory to system path to enable relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent))

from services.firebase_config import initialize_firebase
from firebase_admin import db
import firebase_admin
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def verify_firebase_db():
    """Verify Firebase Realtime Database connection"""
    print("Verifying Firebase Realtime Database connection...")
    try:
        # Initialize Firebase (will use the already initialized app if it exists)
        initialize_firebase()
        
        # Get database reference
        db_ref = db.reference('/')
        
        # Try to write test data
        test_ref = db_ref.child('test').child('connection_test')
        test_ref.set({
            'timestamp': {'.sv': 'timestamp'},
            'status': 'success'
        })
        
        # Read the data back
        test_data = test_ref.get()
        print(f"Successfully connected to Firebase Realtime Database!")
        print(f"Test data: {test_data}")
        
        # Clean up test data
        test_ref.delete()
        
        return True
    except Exception as e:
        print(f"Firebase Realtime Database connection error: {e}")
        print("\nPossible solutions:")
        print("1. Make sure your serviceAccountKey.json has correct permissions for Realtime Database")
        print("2. Check if FIREBASE_DATABASE_URL environment variable is set")
        print("3. Ensure your Firebase project has Realtime Database enabled")
        return False

if __name__ == "__main__":
    verify_firebase_db()
