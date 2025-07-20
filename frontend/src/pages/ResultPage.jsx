import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import Result from "../components/Result";

export default function ResultPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();

  // Initial result from direct upload
  const initialResult = location.state?.result;

  useEffect(() => {
    // If we have result data from state, use that
    if (initialResult) {
      setAnalysisData(initialResult);
      return;
    }

    // If we have an ID parameter, try to fetch the analysis
    const fetchAnalysis = async () => {
      if (!id || !user?.token) return;
      setLoading(true);
      try {
        const data = await api.getAnalysisById(id, user.token);
        if (data) {
          // Format API data to match component expectations
          const formattedResult = {
            fileName: data.metadata?.filename || "Unknown file",
            fileSize: data.metadata?.file_size
              ? `${(data.metadata.file_size / (1024 * 1024)).toFixed(2)} MB`
              : "Unknown",
            format: data.metadata?.filename
              ? data.metadata.filename.split(".").pop().toUpperCase()
              : "Unknown",
            duration: data.metadata?.duration
              ? `${data.metadata.duration.toFixed(2)}s`
              : "Unknown",
            sampleRate: data.metadata?.sample_rate
              ? `${(data.metadata.sample_rate / 1000).toFixed(1)} kHz`
              : "Unknown",
            bitDepth: "16 bits", // Default for most audio files
            channels: "2 (Stereo)", // Default assumption
            is_fake: data.is_deepfake,
            isAI: data.is_deepfake,
            confidence: data.confidence_score * 100, // Convert to percentage
            probability: data.is_deepfake
              ? data.confidence_score
              : 1 - data.confidence_score,
            timestamp: data.analysis_timestamp,
            metadata_id: data.metadata_id,
            analysis_id: data.id,
            details_id: data.details?.id,
            analysisTime: data.details?.processing_time || "Unknown",
            modelUsed: data.model_used === "wav2vec2-xlsr-deepfake" ? "Wav2Vec2 (Advanced)" : 
                       data.model_used === "standard-ml-classifier" ? "Standard ML" :
                       data.model_used === "wav2vec2-demo" ? "Demo Version" :
                       data.model_used === "wav2vec2_transformer_ensemble" ? "Transformer Ensemble" :
                       data.model_used === "transformer_attention_analysis" ? "Attention Analysis" :
                       "Unknown Model",
            details: [],
          };
          // Add details if available
          if (data.details?.feature_scores) {
            const scores = data.details.feature_scores;
            if (scores.mfcc_score !== undefined) {
              formattedResult.details.push({
                label: "Voice Pattern Analysis",
                value: scores.mfcc_score > 0.5 ? "Artificial" : "Natural",
                description:
                  scores.mfcc_score > 0.5
                    ? "Patterns indicate potential AI generation"
                    : "Patterns match typical human speech characteristics",
              });
            }
            if (scores.spectral_score !== undefined) {
              formattedResult.details.push({
                label: "Frequency Analysis",
                value: scores.spectral_score > 0.5 ? "Abnormal" : "Normal",
                description:
                  scores.spectral_score > 0.5
                    ? "Unusual frequency distribution detected"
                    : "Frequency distribution within expected human range",
              });
            }
            if (scores.wav2vec2_score !== undefined && scores.wav2vec2_score > 0) {
              formattedResult.details.push({
                label: "Neural Pattern Analysis",
                value: scores.wav2vec2_score > 0.5 ? "AI Detected" : "Human Likely",
                description:
                  scores.wav2vec2_score > 0.5
                    ? "Neural network detected patterns consistent with AI generation"
                    : "Neural patterns more consistent with human speech",
              });
            }
            if (scores.temporal_score !== undefined) {
              formattedResult.details.push({
                label: "Temporal Coherence",
                value: scores.temporal_score > 0.5 ? "Inconsistent" : "Consistent",
                description:
                  scores.temporal_score > 0.5
                    ? "Time-based patterns show potential synthesis artifacts"
                    : "Time-based patterns show natural human speech variation",
              });
            }
          }
          // If we don't have any details, add a default one
          if (formattedResult.details.length === 0) {
            formattedResult.details.push({
              label: "Overall Analysis",
              value: data.is_deepfake ? "Artificial" : "Natural",
              description: data.is_deepfake
                ? "AI patterns detected in the audio"
                : "Natural human voice characteristics detected",
            });
          }
          setAnalysisData(formattedResult);
        }
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setError("Failed to load analysis details");
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, [id, user, initialResult]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }
  return (
    <div>
      <Result result={analysisData} />
    </div>
  );
}
