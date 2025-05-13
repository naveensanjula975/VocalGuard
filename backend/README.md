# VocalGuard Backend

This is the backend component for the VocalGuard application, which provides deepfake voice detection capabilities.

## Directory Structure

The backend is organized as follows:

```
backend/
├── __pycache__/
├── venv/
├── data/
│   ├── real/           # Real voice samples
│   └── fake/           # Fake/deepfake voice samples
├── models/
│   ├── __init__.py
│   ├── models.py       # Data models and ML model definitions
│   └── deepfake_detector.pth   # ML model weights (to be added)
├── results/            # Output visualizations and metrics
├── core/               # Core ML functionality
│   ├── __init__.py
│   ├── feature_extraction.py   # Audio feature extraction
│   ├── preprocessing.py        # Audio preprocessing
│   ├── augmentation.py         # Data augmentation
│   ├── train.py                # Model training
│   ├── evaluate.py             # Model evaluation
│   └── detect_deepfake.py      # Inference endpoint
├── services/           # External service integrations
│   ├── __init__.py
│   └── firebase_config.py      # Firebase configuration
├── config/             # Configuration files
│   ├── __init__.py
│   └── serviceAccountKey.json  # Firebase service account credentials
├── .env                # Environment variables
├── requirements.txt    # Project dependencies
├── main.py             # Application entry point
├── run_server.bat      # Script to run the server
├── test_firebase.py    # Test script for Firebase
└── verify_setup.py     # Script to verify setup
```

## Setup and Installation

1. Create and activate a virtual environment:

   ```
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. Install the required dependencies:

   ```
   pip install -r requirements.txt
   ```

3. Make sure Firebase is properly configured:

   - Place your Firebase service account key in `config/serviceAccountKey.json`
   - Set the `FIREBASE_WEB_API_KEY` environment variable

4. Run the verification script to check if everything is set up correctly:

   ```
   python verify_setup.py
   ```

5. Start the server:
   ```
   .\run_server.bat
   ```
   or
   ```
   uvicorn main:app --reload
   ```

## API Endpoints

- `GET /`: Welcome message
- `POST /signup`: Register a new user
- `POST /login`: User login
- `GET /protected`: Example protected route (requires authentication)
- `POST /detect-deepfake/`: Detect if an audio file is a deepfake

## Deepfake Detection

The deepfake detection functionality is implemented in the `core` package:

1. Audio is processed and features are extracted using the functions in `feature_extraction.py`
2. The model defined in `models/models.py` makes predictions on the extracted features
3. Results are returned as JSON with the probability of the audio being a deepfake

## Troubleshooting

If you encounter issues with Firebase, try the following:

1. Run `test_firebase.py` to verify Firebase configuration
2. Make sure `serviceAccountKey.json` is in the correct location (either in the `config` directory or the backend root)
3. Check that the Firebase Web API Key is correctly set in the environment variables
