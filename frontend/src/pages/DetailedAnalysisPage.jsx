import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DetailedAnalysis from "../components/DetailedAnalysis";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const DetailedAnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use either the data passed through location state or fetch it from API
  const [analysisData, setAnalysisData] = useState(
    location.state?.analysisData || null
  );

  // Get analysis ID from URL if available
  const { id } = useParams();

  useEffect(() => {
    const fetchAnalysisData = async () => {
      // If we already have data from location state, skip fetching
      if (location.state?.analysisData || !id || !user?.token) return;

      setLoading(true);
      try {
        const data = await api.getAnalysisById(id, user.token);

        if (!data) {
          setError("Analysis not found");
          setLoading(false);
          return;
        }

        // Format the data to match the component's expected format
        const uploadDate = new Date(data.analysis_timestamp || data.metadata?.upload_timestamp);
        const formattedDate = uploadDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });

        // Format the result string
        const resultText = data.is_deepfake
          ? `${Math.round(data.confidence_score * 100)}% Fake`
          : `${Math.round((1 - data.confidence_score) * 100)}% Real`;

        // Extract audio details
        const detailsArray = [];

        // If we have feature details, add them
        if (data.details && data.details.feature_scores) {
          const features = data.details.feature_scores;

          if (features.mfcc_score !== undefined) {
            detailsArray.push({
              label: "Voice Pattern Analysis",
              value: features.mfcc_score > 0.5 ? "Artificial" : "Natural",
              description:
                features.mfcc_score > 0.5
                  ? "Patterns indicate potential AI generation"
                  : "Patterns match typical human speech characteristics",
              score: features.mfcc_score
            });
          }

          if (features.spectral_score !== undefined) {
            detailsArray.push({
              label: "Frequency Analysis",
              value: features.spectral_score > 0.5 ? "Abnormal" : "Normal",
              description:
                features.spectral_score > 0.5
                  ? "Unusual frequency distribution detected"
                  : "Frequency distribution within expected human range",
              score: features.spectral_score
            });
          }
          
          if (features.wav2vec2_score !== undefined) {
            detailsArray.push({
              label: "Neural Pattern Analysis",
              value: features.wav2vec2_score > 0.5 ? "AI Detected" : "Human Likely",
              description:
                features.wav2vec2_score > 0.5
                  ? "Neural network detected patterns consistent with AI generation"
                  : "Neural patterns more consistent with human speech",
              score: features.wav2vec2_score
            });
          }
          
          if (features.temporal_score !== undefined) {
            detailsArray.push({
              label: "Temporal Coherence",
              value: features.temporal_score > 0.5 ? "Inconsistent" : "Consistent",
              description:
                features.temporal_score > 0.5
                  ? "Time-based patterns show potential synthesis artifacts"
                  : "Time-based patterns show natural human speech variation",
              score: features.temporal_score
            });
          }
        }

        // Add default details if none available from API
        if (detailsArray.length === 0) {
          detailsArray.push({
            label: "Overall Analysis",
            value: data.is_deepfake ? "Artificial" : "Natural",
            description: data.is_deepfake
              ? "AI patterns detected in the audio"
              : "Natural human voice characteristics detected",
            score: data.confidence_score
          });
        }

        const formattedData = {
          id: data.id,
          date: formattedDate,
          fileName: data.metadata ? data.metadata.filename : "Unknown File",
          result: resultText,
          isAI: data.is_deepfake,
          confidence: Math.round(data.confidence_score * 100),
          duration: data.metadata
            ? `${data.metadata.duration.toFixed(2)}s`
            : "Unknown",
          format: data.metadata
            ? data.metadata.filename.split(".").pop().toUpperCase()
            : "Unknown",
          sampleRate: data.metadata
            ? `${(data.metadata.sample_rate / 1000).toFixed(1)} kHz`
            : "Unknown",
          analysisTime: data.details
            ? data.details.processing_time.toFixed(0)
            : "Unknown",
          details: detailsArray,
          rawData: data, // Keep the raw data for reference
        };

        setAnalysisData(formattedData);
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setError("Failed to load analysis details");
      }
      setLoading(false);
    };

    fetchAnalysisData();
  }, [id, user, location.state]);

  // If we don't have data and we're not currently loading, redirect to history page
  if (!analysisData && !loading && !error) {
    navigate("/history");
    return null;
  }
  
  const handleBackToResult = () => {
    // If we have the raw data and it includes an ID, use that for navigation
    if (analysisData?.rawData?.id) {
      navigate(`/result/${analysisData.rawData.id}`);
    } 
    // Otherwise use the ID from the URL parameters
    else if (id) {
      navigate(`/result/${id}`);
    }
    // If no ID is available, just go to history
    else {
      navigate("/history");
    }
  };
  
  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto my-12 p-8 bg-red-50 rounded-lg text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => navigate("/history")}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            Return to History
          </button>
        </div>
      ) : analysisData ? (
        <>
          <div className="bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
              <button 
                onClick={handleBackToResult}
                className="flex items-center text-purple-600 hover:text-purple-800 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Basic Result
              </button>
            </div>
          </div>
          <DetailedAnalysis analysisData={analysisData} />
        </>
      ) : null}
    </div>
  );
};

export default DetailedAnalysisPage;
