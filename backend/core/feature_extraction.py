import numpy as np
import librosa
import torch
import torchaudio
from transformers import Wav2Vec2Processor, Wav2Vec2Model
import os
import hashlib
import time
import json
from pathlib import Path