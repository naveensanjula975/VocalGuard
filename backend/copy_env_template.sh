#!/bin/bash

echo "==================================="
echo "VocalGuard Environment Setup"
echo "==================================="

if [ -f .env ]; then
    echo ".env file already exists."
    echo
    echo "Options:"
    echo "1. Keep existing .env file"
    echo "2. Replace with template (you will need to update credentials)"
    echo "3. View current .env file"
    echo
    
    read -p "Enter your choice (1-3): " choice
    
    if [ "$choice" == "2" ]; then
        echo
        echo "Creating new .env file from template..."
        cp .env.example .env
        echo
        echo "New .env file created. Please update it with your Firebase credentials."
    elif [ "$choice" == "3" ]; then
        echo
        echo "Current .env file contents:"
        echo "-------------------------------"
        cat .env
        echo "-------------------------------"
        echo
        read -p "Press Enter to continue..."
    else
        echo
        echo "Keeping existing .env file."
    fi
else
    echo "No .env file found."
    echo
    echo "Creating .env file from template..."
    cp .env.example .env
    
    echo
    echo ".env file has been created from the template."
    echo
    echo "IMPORTANT: Please edit the .env file with your Firebase credentials."
    echo "You can find these in your Firebase project console."
fi

if [ -f .env.actual ]; then
    echo
    echo "Note: A backup of your previous configuration exists in .env.actual"
    echo "You may want to compare the files and copy any important settings."
fi

echo
echo "FIREBASE CREDENTIALS CHECK:"

# Check for serviceAccountKey.json
SERVICE_ACCOUNT_FOUND=0
if [ -f config/serviceAccountKey.json ]; then
    echo "[✓] Found serviceAccountKey.json in config/ directory."
    SERVICE_ACCOUNT_FOUND=1
elif [ -f serviceAccountKey.json ]; then
    echo "[✓] Found serviceAccountKey.json in current directory."
    SERVICE_ACCOUNT_FOUND=1
else
    echo "[!] WARNING: serviceAccountKey.json not found in any expected location."
    echo "    You need to download this file from your Firebase project console:"
    echo "    Project settings > Service accounts > Firebase Admin SDK > Generate new private key"
    echo "    Place the downloaded file in one of these locations:"
    echo "    - backend/config/serviceAccountKey.json"
    echo "    - or backend/serviceAccountKey.json"
fi

echo
echo "IMPORTANT: Never commit your .env file or serviceAccountKey.json to version control."

# Make this script executable
chmod +x ./copy_env_template.sh
