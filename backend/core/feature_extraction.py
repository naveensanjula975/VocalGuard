import numpy as np
import librosa

def extract_features(audio_path, sr=22050, n_mfcc=40):
    """
    Extract audio features from an audio file
    
    Args:
        audio_path: Path to the audio file
        sr: Sample rate (default: 22050)
        n_mfcc: Number of MFCC features to extract (default: 40)
        
    Returns:
        numpy.ndarray: Extracted features
    """
    try:
        # Load the audio file
        y, sr = librosa.load(audio_path, sr=sr)
        
        # Extract MFCCs
        mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
        
        # Calculate statistics for each MFCC coefficient
        mfcc_mean = np.mean(mfccs, axis=1)
        mfcc_var = np.var(mfccs, axis=1)
        mfcc_features = np.concatenate((mfcc_mean, mfcc_var))
        
        # Extract additional features
        spectral_centroid = np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)[0])
        spectral_rolloff = np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr)[0])
        zcr = np.mean(librosa.feature.zero_crossing_rate(y)[0])
        
        # Create feature vector
        features = np.concatenate((mfcc_features, [spectral_centroid, spectral_rolloff, zcr]))
        
        return features
        
    except Exception as e:
        print(f"Error extracting features: {e}")
        # Return a zero vector as fallback
        return np.zeros(n_mfcc * 2 + 3)