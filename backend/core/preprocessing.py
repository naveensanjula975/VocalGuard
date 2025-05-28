# Audio preprocessing functions
import numpy as np
import librosa

def load_audio(file_path, sr=16000):
    """
    Load an audio file and convert it to a specific sample rate
    
    Args:
        file_path (str): Path to the audio file
        sr (int): Target sample rate
        
    Returns:
        np.ndarray: Audio data
        float: Sample rate
    """
    y, sr = librosa.load(file_path, sr=sr)
    return y, sr

def preprocess_audio(y, sr, n_mfcc=13, n_fft=2048, hop_length=512):
    """
    Extract MFCCs from audio data
    
    Args:
        y (np.ndarray): Audio data
        sr (int): Sample rate
        n_mfcc (int): Number of MFCCs to extract
        n_fft (int): FFT window size
        hop_length (int): Hop length for the FFT window
        
    Returns:
        np.ndarray: MFCC features
    """
    # Extract MFCCs
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc, n_fft=n_fft, hop_length=hop_length)
    
    # Normalize MFCCs
    mfccs = (mfccs - np.mean(mfccs)) / np.std(mfccs)
    
    return mfccs

def split_into_segments(mfccs, segment_length=128):
    """
    Split MFCCs into segments of fixed length
    
    Args:
        mfccs (np.ndarray): MFCC features
        segment_length (int): Length of each segment
        
    Returns:
        np.ndarray: Segmented MFCCs
    """
    num_segments = mfccs.shape[1] // segment_length
    segments = []
    
    for i in range(num_segments):
        segment = mfccs[:, i * segment_length:(i + 1) * segment_length]
        segments.append(segment)
    
    return np.array(segments)
