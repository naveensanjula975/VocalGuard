# VocalGuard - Audio Deepfake Detection Web Application

## Overview

VocalGuard is an AI-powered web application that helps detect audio deepfakes. The system analyzes uploaded audio files using machine learning techniques and provides detailed results about whether the audio is authentic or artificially generated.

## Features

- Audio deepfake detection with confidence scoring
- Advanced analysis using Wav2Vec2 neural network model
- Adaptive feature weighting based on audio characteristics
- Optimized performance with embedding caching system
- User authentication and secure storage
- History of previous analyses
- Detailed feature-level analysis results
- Demo mode for quick testing without account creation

## Project Structure

- `/backend`: FastAPI backend service with ML processing and Firebase integration
- `/frontend`: React.js frontend application

## Advanced Audio Analysis with Wav2Vec2

VocalGuard now integrates Wav2Vec2, a powerful pre-trained neural network model for speech processing developed by Facebook AI Research. This integration significantly enhances the detection capabilities:

### Wav2Vec2 Features

- **Neural Pattern Recognition**: Analyzes deep speech patterns beyond traditional audio features
- **Temporal Pattern Analysis**: Better detection of inconsistencies in speech timing and articulation
- **Enhanced Feature Extraction**: Combines traditional MFCC features with neural embeddings
- **Toggle Option**: Users can choose between standard analysis and advanced Wav2Vec2 analysis

### How It Works

1. When advanced analysis is selected, audio is processed through the Wav2Vec2 model
2. The model extracts 768-dimensional embeddings that capture nuanced speech characteristics
3. These embeddings are combined with traditional audio features for improved detection
4. Results show detailed feature-level scores including neural pattern analysis

### Setup

To enable Wav2Vec2 analysis:

```bash
# Navigate to the backend directory
cd backend

# Run the setup script
setup_wav2vec2.bat  # Windows
# or 
./setup_wav2vec2.sh  # Linux/Mac
```

## Deployment

- **Frontend**: Deployed to Firebase Hosting
- **Backend**: Deployed to Google Cloud Run

## Tech Stack

- **Backend**:

  - FastAPI for API endpoints
  - Firebase Authentication for user management
  - Firebase Realtime Database for storing analysis metadata
  - PyTorch and Wav2Vec2 for advanced audio analysis
  - TensorFlow/PyTorch for ML model implementation
  - Librosa for audio processing

- **Frontend**:
  - React.js with hooks
  - Context API for state management
  - TailwindCSS for styling

## Getting Started

1. Clone the repository
2. Set up the backend (see `/backend/README.md`)
3. Set up the frontend (see `/frontend/README.md`)

## Database Structure

The application uses Firebase Realtime Database with the following structure:

- `audio_metadata`: Stores information about uploaded audio files
- `analysis_results`: Stores deepfake detection results
- `result_details`: Stores detailed analysis information

For more details, see the complete documentation in the backend README.
