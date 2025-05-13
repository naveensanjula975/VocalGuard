import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DetailedAnalysis from "../components/DetailedAnalysis";

const DetailedAnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysisData = location.state?.analysisData || {
    fileName: "sample_audio.mp3",
    date: "Feb 7, 2025",
    duration: "2:45",
    format: "MP3",
    sampleRate: "44.1 kHz",
    isAI: false,
    confidence: 98,
    analysisTime: "2450",
    details: [
      {
        label: "Voice Pattern Analysis",
        value: "Natural",
        description: "Patterns match typical human speech characteristics",
      },
      {
        label: "Frequency Analysis",
        value: "Normal",
        description: "Frequency distribution within expected human range",
      },
      {
        label: "Background Noise",
        value: "Low",
        description: "Minimal background noise detected",
      },
      {
        label: "Speech Clarity",
        value: "High",
        description: "Clear and distinct speech patterns",
      },
    ],
  };

  if (!location.state?.analysisData) {
    // If no data is passed, redirect to history page
    navigate("/history");
    return null;
  }

  return (
    <div>
      <DetailedAnalysis analysisData={analysisData} />
    </div>
  );
};

export default DetailedAnalysisPage;
