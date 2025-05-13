#!/usr/bin/env python
# coding: utf-8

"""
This script generates dummy data in Firebase Realtime Database for demonstration purposes.
It creates sample audio metadata, analysis results, and result details for a user.
"""

import os
import sys
from pathlib import Path

# Add the parent directory to system path to enable relative imports
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir.parent))

from services.firebase_config import initialize_firebase
from services.database_service import DatabaseService
from firebase_admin import auth

def create_dummy_user():
    """Create a demo user if not exists"""
    email = "demo@vocalguard.com"
    password = "demo123"
    
    try:
        # Try to get user by email
        user = auth.get_user_by_email(email)
        print(f"Demo user already exists with ID: {user.uid}")
        return user.uid
    except:
        # Create user if doesn't exist
        user = auth.create_user(
            email=email,
            password=password,
            display_name="Demo User"
        )
        print(f"Created demo user with ID: {user.uid}")
        return user.uid

def generate_dummy_data():
    """Generate dummy data for a demo user"""
    # Initialize Firebase
    initialize_firebase()
    
    # Create demo user
    user_id = create_dummy_user()
    
    # Create database service
    db_service = DatabaseService()
    
    # Generate dummy data for the user
    analysis_ids = db_service.create_dummy_data(user_id)
    
    print(f"Generated {len(analysis_ids)} dummy analyses")
    print("Analysis IDs:", analysis_ids)
    
    return analysis_ids

if __name__ == "__main__":
    generate_dummy_data()
