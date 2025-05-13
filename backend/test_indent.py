# Test script to validate indentation fixes
from services.database_service import DatabaseService
from core.detect_deepfake import detect_deepfake

# Simple validation
print("Database service class loaded successfully")
print("detect_deepfake function loaded successfully")

db = DatabaseService()
print("Database service instance created successfully")

print("All indentation issues fixed!")
