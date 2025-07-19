import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import librosa
import torchaudio
from transformers import Wav2Vec2FeatureExtractor, AutoModelForAudioClassification
from safetensors.torch import load_file
import os
import math

class MultiHeadAttention(nn.Module):
    """Multi-head attention mechanism for audio features"""
    
    def __init__(self, d_model, num_heads, dropout=0.1):
        super(MultiHeadAttention, self).__init__()
        self.d_model = d_model
        self.num_heads = num_heads
        self.d_k = d_model // num_heads
        
        self.w_q = nn.Linear(d_model, d_model)
        self.w_k = nn.Linear(d_model, d_model)
        self.w_v = nn.Linear(d_model, d_model)
        self.w_o = nn.Linear(d_model, d_model)
        
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)
        
    def scaled_dot_product_attention(self, Q, K, V, mask=None):
        """Compute scaled dot product attention"""
        scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(self.d_k)
        
        if mask is not None:
            scores = scores.masked_fill(mask == 0, -1e9)
        
        attention_weights = F.softmax(scores, dim=-1)
        attention_weights = self.dropout(attention_weights)
        
        context = torch.matmul(attention_weights, V)
        return context, attention_weights
    
    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)
        
        # Linear transformations
        Q = self.w_q(query).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        K = self.w_k(key).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        V = self.w_v(value).view(batch_size, -1, self.num_heads, self.d_k).transpose(1, 2)
        
        # Apply attention
        context, attention_weights = self.scaled_dot_product_attention(Q, K, V, mask)
        
        # Concatenate heads
        context = context.transpose(1, 2).contiguous().view(
            batch_size, -1, self.d_model
        )
        
        # Final linear transformation
        output = self.w_o(context)
        
        # Residual connection and layer norm
        output = self.layer_norm(output + query)
        
        return output, attention_weights

class PositionalEncoding(nn.Module):
    """Positional encoding for transformer"""
    
    def __init__(self, d_model, max_len=5000):
        super(PositionalEncoding, self).__init__()
        
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * 
                           (-math.log(10000.0) / d_model))
        
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0).transpose(0, 1)
        
        self.register_buffer('pe', pe)
    
    def forward(self, x):
        return x + self.pe[:x.size(0), :]

class FeedForward(nn.Module):
    """Feed-forward network"""
    
    def __init__(self, d_model, d_ff, dropout=0.1):
        super(FeedForward, self).__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)
        
    def forward(self, x):
        output = self.linear2(self.dropout(F.relu(self.linear1(x))))
        return self.layer_norm(output + x)

class TransformerBlock(nn.Module):
    """Single transformer block"""
    
    def __init__(self, d_model, num_heads, d_ff, dropout=0.1):
        super(TransformerBlock, self).__init__()
        self.attention = MultiHeadAttention(d_model, num_heads, dropout)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)
        
    def forward(self, x, mask=None):
        x, attention_weights = self.attention(x, x, x, mask)
        x = self.feed_forward(x)
        return x, attention_weights

class AudioTransformer(nn.Module):
    """
    Transformer model for audio deepfake detection with attention mechanism
    """
    
    def __init__(self, input_dim=1024, d_model=512, num_heads=8, num_layers=6, 
                 d_ff=2048, max_len=1000, dropout=0.1, num_classes=2):
        super(AudioTransformer, self).__init__()
        
        self.d_model = d_model
        self.input_projection = nn.Linear(input_dim, d_model)
        self.positional_encoding = PositionalEncoding(d_model, max_len)
        
        self.transformer_blocks = nn.ModuleList([
            TransformerBlock(d_model, num_heads, d_ff, dropout)
            for _ in range(num_layers)
        ])
        
        self.dropout = nn.Dropout(dropout)
        self.layer_norm = nn.LayerNorm(d_model)
        
        # Classification head
        self.global_pool = nn.AdaptiveAvgPool1d(1)
        self.classifier = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, d_model // 4),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 4, num_classes)
        )
        
    def forward(self, x, mask=None):
        # Input projection
        x = self.input_projection(x)
        x = x * math.sqrt(self.d_model)
        
        # Add positional encoding
        x = self.positional_encoding(x)
        x = self.dropout(x)
        
        # Apply transformer blocks
        attention_weights = []
        for transformer_block in self.transformer_blocks:
            x, attn_weights = transformer_block(x, mask)
            attention_weights.append(attn_weights)
        
        x = self.layer_norm(x)
        
        # Global pooling and classification
        x = x.transpose(1, 2)  # (batch, d_model, seq_len)
        x = self.global_pool(x).squeeze(-1)  # (batch, d_model)
        
        output = self.classifier(x)
        
        return output, attention_weights

class TransformerDeepfakeDetector:
    """
    Transformer-based deepfake detector using attention mechanism
    """
    
    def __init__(self, model_path=None, device=None):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # Load base wav2vec2 model for feature extraction
        self.feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
            model_path or "facebook/wav2vec2-base"
        )
        self.base_model = AutoModelForAudioClassification.from_pretrained(
            model_path or "facebook/wav2vec2-base",
            use_safetensors=True
        ).to(self.device)
        
        # Initialize transformer model
        self.transformer_model = AudioTransformer(
            input_dim=1024,  # Wav2Vec2 output dimension
            d_model=512,
            num_heads=8,
            num_layers=6,
            d_ff=2048,
            dropout=0.1,
            num_classes=2
        ).to(self.device)
        
        # Load transformer weights if available
        if model_path and os.path.exists(os.path.join(model_path, "model.safetensors")):
            self.load_transformer_weights(model_path)
        
        self.transformer_model.eval()
        
        # Class labels
        self.id2label = {0: "real", 1: "fake"}
        self.label2id = {"real": 0, "fake": 1}
        
    def load_transformer_weights(self, model_path):
        """Load transformer weights from safetensors file"""
        try:
            safetensors_path = os.path.join(model_path, "model.safetensors")
            if os.path.exists(safetensors_path):
                # Load weights from safetensors
                state_dict = load_file(safetensors_path)
                
                # Filter weights for transformer model
                transformer_weights = {}
                for key, value in state_dict.items():
                    if "transformer" in key or "classifier" in key:
                        transformer_weights[key.replace("transformer.", "")] = value
                
                # Load weights into transformer model
                if transformer_weights:
                    self.transformer_model.load_state_dict(transformer_weights, strict=False)
                    print("Loaded transformer weights from safetensors")
                else:
                    print("No transformer weights found in safetensors file")
            else:
                print(f"Safetensors file not found: {safetensors_path}")
        except Exception as e:
            print(f"Error loading transformer weights: {e}")
    
    def extract_features(self, audio_path):
        """Extract features from audio using Wav2Vec2"""
        try:
            # Load audio
            waveform, sample_rate = librosa.load(audio_path, sr=16000)
            waveform = waveform.astype(np.float32)
            
            # Process through feature extractor
            inputs = self.feature_extractor(
                waveform,
                sampling_rate=16000,
                return_tensors="pt"
            )
            
            # Move to device
            inputs = {key: val.to(self.device) for key, val in inputs.items()}
            
            # Extract features using base model
            with torch.no_grad():
                outputs = self.base_model.wav2vec2(**inputs, output_hidden_states=True)
                # Use last hidden state as features
                features = outputs.hidden_states[-1]  # (batch, seq_len, hidden_size)
            
            return features
            
        except Exception as e:
            print(f"Error extracting features: {e}")
            return None
    
    def detect(self, audio_path, threshold=0.5):
        """
        Detect deepfake audio using transformer with attention
        
        Args:
            audio_path (str): Path to audio file
            threshold (float): Classification threshold
            
        Returns:
            dict: Detection results with attention weights
        """
        try:
            # Extract features
            features = self.extract_features(audio_path)
            if features is None:
                return {"error": "Failed to extract features"}
            
            # Run transformer inference
            with torch.no_grad():
                logits, attention_weights = self.transformer_model(features)
                
                # Get probabilities
                probabilities = F.softmax(logits, dim=1)
                predictions = torch.argmax(probabilities, dim=1)
                
                # Convert to numpy
                pred_idx = predictions[0].cpu().item()
                confidence = probabilities[0][pred_idx].cpu().item()
                all_probs = probabilities[0].cpu().numpy()
                
                # Process attention weights for visualization
                avg_attention = torch.mean(attention_weights[-1], dim=1).cpu().numpy()  # Average over heads
                
                result = {
                    "prediction": self.id2label[pred_idx],
                    "confidence": confidence,
                    "label_index": pred_idx,
                    "probabilities": {
                        self.id2label[i]: float(prob) for i, prob in enumerate(all_probs)
                    },
                    "is_fake": pred_idx == 1,
                    "attention_weights": avg_attention.tolist(),
                    "model_type": "transformer_attention"
                }
                
                return result
                
        except Exception as e:
            print(f"Error in transformer detection: {e}")
            return {
                "error": str(e),
                "prediction": "error",
                "confidence": 0.0,
                "is_fake": None,
                "model_type": "transformer_attention"
            }
    
    def get_attention_analysis(self, audio_path):
        """
        Get detailed attention analysis for visualization
        
        Args:
            audio_path (str): Path to audio file
            
        Returns:
            dict: Detailed attention analysis
        """
        try:
            features = self.extract_features(audio_path)
            if features is None:
                return {"error": "Failed to extract features"}
            
            with torch.no_grad():
                logits, attention_weights = self.transformer_model(features)
                
                # Process attention weights for each layer
                attention_analysis = {
                    "num_layers": len(attention_weights),
                    "num_heads": attention_weights[0].shape[1],
                    "sequence_length": attention_weights[0].shape[2],
                    "layer_attention": []
                }
                
                for i, layer_attention in enumerate(attention_weights):
                    # Average attention across heads for each layer
                    avg_layer_attention = torch.mean(layer_attention, dim=1).cpu().numpy()
                    attention_analysis["layer_attention"].append({
                        "layer": i + 1,
                        "attention_matrix": avg_layer_attention.tolist(),
                        "max_attention": float(torch.max(layer_attention).cpu()),
                        "min_attention": float(torch.min(layer_attention).cpu())
                    })
                
                return attention_analysis
                
        except Exception as e:
            print(f"Error in attention analysis: {e}")
            return {"error": str(e)}

def create_transformer_detector(model_path=None):
    """
    Create a transformer-based deepfake detector
    
    Args:
        model_path (str): Path to model directory
        
    Returns:
        TransformerDeepfakeDetector: Initialized detector
    """
    return TransformerDeepfakeDetector(model_path)

# Example usage function
def detect_with_transformer(audio_path, model_path=None):
    """
    Detect deepfake audio using transformer model
    
    Args:
        audio_path (str): Path to audio file
        model_path (str): Path to model directory
        
    Returns:
        dict: Detection results
    """
    detector = create_transformer_detector(model_path)
    return detector.detect(audio_path)
