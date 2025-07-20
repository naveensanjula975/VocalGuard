# Data augmentation techniques
import numpy as np
import librosa
import random

def time_stretch(y, rate=None):
    """
    Time stretch the audio signal
    
    Args:
        y (np.ndarray): Audio data
        rate (float, optional): Stretch rate. If None, a random rate between 0.8 and 1.2 is chosen.
        
    Returns:
        np.ndarray: Time stretched audio
    """
    if rate is None:
        rate = random.uniform(0.8, 1.2)  # Random stretch between 0.8x and 1.2x
    
    return librosa.effects.time_stretch(y, rate=rate)

def pitch_shift(y, sr, n_steps=None):
    """
    Pitch shift the audio signal
    
    Args:
        y (np.ndarray): Audio data
        sr (int): Sample rate
        n_steps (int, optional): Number of semitones to shift. If None, a random integer between -3 and 3 is chosen.
        
    Returns:
        np.ndarray: Pitch shifted audio
    """
    if n_steps is None:
        n_steps = random.randint(-3, 3)  # Random pitch shift between -3 and +3 semitones
    
    return librosa.effects.pitch_shift(y, sr=sr, n_steps=n_steps)

def add_noise(y, noise_level=0.005):
    """
    Add gaussian noise to the audio signal
    
    Args:
        y (np.ndarray): Audio data
        noise_level (float): Standard deviation of the noise
        
    Returns:
        np.ndarray: Audio with added noise
    """
    noise = np.random.normal(0, noise_level, y.shape[0])
    return y + noise

def random_augment(y, sr):
    """
    Randomly apply one or more augmentation techniques
    
    Args:
        y (np.ndarray): Audio data
        sr (int): Sample rate
        
    Returns:
        np.ndarray: Augmented audio
    """
    augmentations = [
        lambda y, sr: time_stretch(y),
        lambda y, sr: pitch_shift(y, sr),
        lambda y, sr: add_noise(y)
    ]
    
    # Apply 1-2 random augmentations
    num_augmentations = random.randint(1, 2)
    selected_augmentations = random.sample(augmentations, num_augmentations)
    
    augmented_y = y.copy()
    for augment_fn in selected_augmentations:
        augmented_y = augment_fn(augmented_y, sr)
    
    return augmented_y
