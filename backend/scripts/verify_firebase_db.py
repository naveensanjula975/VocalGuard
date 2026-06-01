#!/usr/bin/env python
# coding: utf-8

"""
Verify Firebase Firestore Database connection and initialization.
"""

import os
import sys
from pathlib import Path
import datetime

# Add the parent directory to system path to enable relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent))

from services.firebase_config import initialize_firebase
from firebase_admin import firestore
import firebase_admin
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def verify_firebase_db():
    """Verify Firebase Firestore Database connection"""
    print("Verifying Firebase Firestore Database connection...")
    try:
        # Initialize Firebase (will use the already initialized app if it exists)
        initialize_firebase()
        
        # Get Firestore client
        db = firestore.client()
        
        # Try to write test data
        test_ref = db.collection('test').document('connection_test')
        test_ref.set({
            'timestamp': datetime.datetime.now(),
            'status': 'success'
        })
        # Read the data back
        test_data = test_ref.get().to_dict()
        print(f"Successfully connected to Firebase Firestore Database!")
        print(f"Test data: {test_data}")
        
        # Clean up test data
        test_ref.delete()
        
        return True
    except Exception as e:
        print(f"Firebase Firestore Database connection error: {e}")
        print("\nPossible solutions:")
        print("1. Make sure your serviceAccountKey.json has correct permissions for Firestore")
        print("2. Ensure your Firebase project has Firestore enabled in Native mode")
        print("3. Check if your Firebase project has proper billing setup for Firestore")
        return False

if __name__ == "__main__":
    verify_firebase_db()
