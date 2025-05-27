"""
Verification script for the new backend structure
"""
import os
import sys
from pathlib import Path

# Add the current directory to the system path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def check_imports():
    """Check all necessary imports"""
    try:
        # Models
        from models.models import UserSignUp, UserLogin, DeepFakeDetector
        print("✅ Successfully imported models")
        
        # Core functionality
        from core.detect_deepfake import detect_deepfake
        from core.feature_extraction import extract_features
        print("✅ Successfully imported core functionality")
        
        # Firebase
        from services.firebase_config import initialize_firebase
        print("✅ Successfully imported firebase_config")
        
        return True
    except Exception as e:
        print(f"❌ Error importing modules: {e}")
        return False

def check_directories():
    """Verify directory structure"""
    required_dirs = [
        "core",
        "models",
        "services",
        "config",
        "data",
        "results"
    ]
    
    for dir_name in required_dirs:
        if os.path.isdir(os.path.join(current_dir, dir_name)):
            print(f"✅ Directory exists: {dir_name}")
        else:
            print(f"❌ Directory missing: {dir_name}")
    
    return True

def check_config_files():
    """Check if configuration files exist"""
    config_files = [
        os.path.join(current_dir, "config", "serviceAccountKey.json"),
        os.path.join(current_dir, ".env"),
    ]
    
    for file_path in config_files:
        if os.path.isfile(file_path):
            print(f"✅ Config file exists: {os.path.basename(file_path)}")
        else:
            alt_path = ""
            if "serviceAccountKey.json" in file_path:
                alt_path = os.path.join(current_dir, "serviceAccountKey.json")
                if os.path.isfile(alt_path):
                    print(f"⚠️ Config file found at alternative location: serviceAccountKey.json")
                    continue
            print(f"❌ Config file missing: {os.path.basename(file_path)}")
    
    return True

if __name__ == "__main__":
    print("=" * 50)
    print("Verifying Backend Structure")
    print("=" * 50)
    
    print("\nChecking directory structure...")
    check_directories()
    
    print("\nChecking configuration files...")
    check_config_files()
    
    print("\nChecking imports...")
    check_imports()
    
    print("\n" + "=" * 50)
    print("Verification Complete")
    print("=" * 50)
