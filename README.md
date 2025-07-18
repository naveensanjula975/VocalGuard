#<h1 align="center">VocalGuard - Audio Deepfake Detection System</h1> 

<p align="center">
  <img src="frontend/src/assets/logo.png" alt="VocalGuard Logo" width="200"/>
</p>

<p align="center">
  <strong>AI-powered audio deepfake detection for secure voice authentication</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#api-documentation">API</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 🔍 Overview

VocalGuard is a sophisticated web application that leverages advanced machine learning techniques to detect audio deepfakes with high accuracy. The system combines multiple AI models including Wav2Vec2 and Transformer-based architectures to provide comprehensive audio authenticity analysis.

### 🎯 Key Capabilities

- **Multi-Model Detection**: Ensemble approach using Wav2Vec2 and Transformer models
- **Real-time Analysis**: Fast processing with detailed confidence scoring
- **User Authentication**: Secure Firebase-based user management
- **Analysis History**: Complete tracking of user analysis sessions
- **Detailed Reports**: Comprehensive analysis with attention visualization
- **Cross-Platform**: Web-based interface accessible from any device

## 🛠️ Tech Stack

### Backend
- **FastAPI**: High-performance web framework
- **Firebase Admin SDK**: Authentication and database management
- **PyTorch**: Deep learning framework
- **Transformers**: Hugging Face transformers library
- **Librosa**: Audio processing and feature extraction
- **Wav2Vec2**: Pre-trained audio representation model

### Frontend
- **React 19**: Modern UI framework
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Chart.js**: Data visualization
- **React Router**: Client-side routing

### Machine Learning
- **Wav2Vec2-XLSR**: Primary deepfake detection model
- **Transformer Architecture**: Attention-based analysis
- **Ensemble Methods**: Multiple model combination
- **Feature Extraction**: MFCC, spectral, and temporal features

### Deployment
- **Frontend**: Firebase Hosting
- **Backend**: Google Cloud Run
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage

## ✨ Features

### 🔐 Authentication & Security
- Secure user registration and login
- JWT-based authentication
- Password reset functionality
- Protected routes and API endpoints

### 🎵 Audio Analysis
- **Multiple Detection Modes**:
  - Basic detection (demo mode)
  - Advanced Wav2Vec2 analysis
  - Transformer-based detection
  - Ensemble model prediction
  - Attention analysis visualization

### 📊 Analysis Features
- Confidence scoring (0-100%)
- Detailed feature breakdown
- Processing time metrics
- Model version tracking
- Historical analysis comparison

### 👤 User Management
- Personal analysis history
- Detailed result storage
- Export capabilities (PDF)
- Analysis sharing options

### 📈 Visualization
- Real-time confidence meters
- Attention heatmaps
- Feature importance charts
- Processing statistics

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **Python** (3.8 or higher)
- **Git**
- **Firebase Account** (for backend services)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/naveensanjula975/VocalGuard.git
cd VocalGuard
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set up Firebase configuration
# Add your serviceAccountKey.json to config/ directory
# Create .env file with necessary environment variables
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment configuration
# Add your Firebase config and API endpoints
```

### 4. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication and Firestore
3. Download `serviceAccountKey.json` and place it in `backend/config/`
4. Update frontend Firebase configuration in your environment files

## 🏃‍♂️ Usage

### Development Mode

#### Start Backend Server
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

### Production Deployment

#### Backend (Google Cloud Run)
```bash
# Build and deploy to Google Cloud Run
gcloud run deploy vocalguard-backend --source . --platform managed
```

#### Frontend (Firebase Hosting)
```bash
# Build and deploy to Firebase Hosting
npm run build
firebase deploy
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | User registration |
| POST | `/login` | User authentication |
| GET | `/protected` | Protected route example |

### Detection Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/detect-deepfake/` | Basic deepfake detection |
| POST | `/detect-deepfake-advanced/` | Advanced Wav2Vec2 analysis |
| POST | `/detect-deepfake-transformer/` | Transformer-based detection |
| POST | `/detect-deepfake-attention-analysis/` | Detailed attention analysis |
| POST | `/detect-deepfake-demo` | Public demo endpoint |

### User Data Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/analyses` | Get user's analysis history |
| GET | `/data/analyses` | Get analysis data |
| GET | `/data/analyses/{id}` | Get specific analysis |

### Request/Response Examples

#### Deepfake Detection Request
```bash
curl -X POST "http://localhost:8000/detect-deepfake/" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@audio_sample.wav"
```

#### Response Format
```json
{
  "probability": 0.85,
  "is_fake": true,
  "confidence": 0.85,
  "label": "fake",
  "model_used": "wav2vec2-xlsr-deepfake",
  "processing_time": 1250.5,
  "filename": "audio_sample.wav",
  "probabilities": {
    "real": 0.15,
    "fake": 0.85
  }
}
```

## 🧪 Model Architecture

### Primary Models

1. **Wav2Vec2-XLSR**: Pre-trained multilingual speech representation model
2. **Transformer Detector**: Custom attention-based architecture
3. **Ensemble Approach**: Weighted combination of multiple models

### Detection Pipeline

1. **Audio Preprocessing**: Standardization and resampling to 16kHz
2. **Feature Extraction**: Wav2Vec2 embeddings + traditional audio features
3. **Model Inference**: Multi-model prediction and ensemble
4. **Post-processing**: Confidence calibration and result formatting

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
API_BASE_URL=http://localhost:8000
ENVIRONMENT=development
```

### Model Configuration

The system uses pre-trained models stored in `backend/models/deepfake_audio_model/`:
- `config.json`: Model configuration
- `model.safetensors`: Model weights
- `preprocessor_config.json`: Audio preprocessing settings

## 📊 Performance Metrics

- **Accuracy**: >95% on test datasets
- **Processing Time**: <2 seconds for 30-second audio clips
- **Supported Formats**: WAV, MP3, FLAC, M4A
- **Maximum File Size**: 10MB
- **Sample Rates**: Auto-resampled to 16kHz

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">Made with ❤️ by the VocalGuard Team</p>
