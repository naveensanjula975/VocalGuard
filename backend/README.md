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

5. Set up the required environment variables:

   - Copy `.env.example` to `.env` and update with your Firebase configuration

   ```
   copy .env.example .env
   ```

6. Verify your Firebase configuration:

   ```
   python scripts/verify_firebase_db.py
   ```

7. Start the server:
   ```
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Endpoints

- `GET /`: Welcome message
- `POST /signup`: Register a new user
- `POST /login`: User login
- `GET /protected`: Example protected route (requires authentication)
- `POST /detect-deepfake/`: Detect if an audio file is a deepfake (requires authentication)
- `POST /detect-deepfake-demo`: Demo endpoint for deepfake detection (no authentication required)
- `GET /user/analyses`: Get all analyses for the authenticated user
- `GET /analyses/{analysis_id}`: Get a specific analysis by ID
- `POST /generate-dummy-data`: Generate dummy data for testing purposes

## Deepfake Detection

The deepfake detection functionality is implemented in the `core` package:

1. Audio is processed and features are extracted using the functions in `feature_extraction.py`
2. The model defined in `models/models.py` makes predictions on the extracted features
3. Results are returned as JSON with the probability of the audio being a deepfake

## Firebase Realtime Database Structure

The application uses Firebase Realtime Database to store metadata and analysis results with the following structure:

```
vocalguard-default-rtdb/
├── audio_metadata/                 # Audio file metadata
│   └── {metadata_id}/
│       ├── id                      # Unique identifier
│       ├── user_id                 # ID of the user who uploaded the audio
│       ├── filename                # Original filename
│       ├── file_size               # Size in bytes
│       ├── duration                # Duration in seconds
│       ├── sample_rate             # Audio sample rate
│       └── upload_timestamp        # ISO format timestamp
│
├── analysis_results/               # Analysis results
│   └── {analysis_id}/
│       ├── id                      # Unique identifier
│       ├── metadata_id             # Reference to audio_metadata
│       ├── is_deepfake            # Boolean result
│       ├── confidence_score        # Confidence (0-1)
│       ├── features_used           # List of features used
│       └── analysis_timestamp      # ISO format timestamp
│
└── result_details/                 # Detailed analysis information
    └── {details_id}/
        ├── id                      # Unique identifier
        ├── analysis_id             # Reference to analysis_results
        ├── feature_scores          # Individual feature scores
        ├── model_version           # Version of the model used
        ├── processing_time         # Time in milliseconds
        └── created_at              # ISO format timestamp
```

## Environment Variables

The application requires the following environment variables:

```
FIREBASE_WEB_API_KEY=your-firebase-web-api-key
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
```

## Troubleshooting

If you encounter issues with Firebase, try the following:

1. Make sure `serviceAccountKey.json` is in the correct location (either in the `config` directory or the backend root)
2. Check that the Firebase Web API Key and Database URL are correctly set in the environment variables
3. Ensure your Firebase project has Realtime Database enabled
4. Check Firebase security rules to ensure your application has proper read/write permissions

## Utility Scripts

The `scripts` directory contains several utility scripts:

1. `verify_firebase_db.py` - Verifies connection to Firebase Realtime Database

   ```
   python scripts/verify_firebase_db.py
   ```

2. `generate_dummy_data.py` - Creates dummy data in the database for demonstration purposes

   ```
   python scripts/generate_dummy_data.py
   ```

3. `test_workflow.py` - Tests the complete detection workflow with database integration
   ```
   python scripts/test_workflow.py
   ```
