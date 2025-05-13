# VocalGuard - Audio Deepfake Detection Web Application

## Overview

VocalGuard is an AI-powered web application that helps detect audio deepfakes. The system analyzes uploaded audio files using machine learning techniques and provides detailed results about whether the audio is authentic or artificially generated.

## Features

- Audio deepfake detection with confidence scoring
- User authentication and secure storage
- History of previous analyses
- Detailed feature-level analysis results
- Demo mode for quick testing without account creation

## Project Structure

- `/backend`: FastAPI backend service with ML processing and Firebase integration
- `/frontend`: React.js frontend application

## Deployment

- **Frontend**: Deployed to Firebase Hosting
- **Backend**: Deployed to Google Cloud Run

## Tech Stack

- **Backend**:

  - FastAPI for API endpoints
  - Firebase Authentication for user management
  - Firebase Realtime Database for storing analysis metadata
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
