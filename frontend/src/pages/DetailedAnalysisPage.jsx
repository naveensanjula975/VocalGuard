import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DetailedAnalysis from "../components/DetailedAnalysis";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import "../styles/design-tokens.css";
import "../components/DetailedAnalysis.css";

const DetailedAnalysisPage = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const { id }    = useParams();

  const [analysisData, setAnalysisData] = useState(location.state?.analysisData || null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (location.state?.analysisData || !id || !user?.token) return;
    setLoading(true);

    api.getAnalysisById(id, user.token).then((data) => {
      if (!data) { setError("Analysis not found"); setLoading(false); return; }

      const uploadDate    = new Date(data.analysis_timestamp || data.metadata?.upload_timestamp);
      const formattedDate = uploadDate.toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });

      const detailsArray = [];
      if (data.details?.feature_scores) {
        const f = data.details.feature_scores;
        if (f.mfcc_score !== undefined)     detailsArray.push({ label:"Voice Pattern Analysis",  value: f.mfcc_score     > 0.5 ? "Artificial" : "Natural",    description: f.mfcc_score     > 0.5 ? "Patterns indicate potential AI generation"                         : "Patterns match typical human speech characteristics",  score: f.mfcc_score });
        if (f.spectral_score !== undefined) detailsArray.push({ label:"Frequency Analysis",       value: f.spectral_score > 0.5 ? "Abnormal"   : "Normal",      description: f.spectral_score > 0.5 ? "Unusual frequency distribution detected"                         : "Frequency distribution within expected human range",   score: f.spectral_score });
        if (f.wav2vec2_score !== undefined) detailsArray.push({ label:"Neural Pattern Analysis",  value: f.wav2vec2_score > 0.5 ? "AI Detected": "Human Likely", description: f.wav2vec2_score > 0.5 ? "Neural network detected patterns consistent with AI generation" : "Neural patterns more consistent with human speech",     score: f.wav2vec2_score });
        if (f.temporal_score !== undefined) detailsArray.push({ label:"Temporal Coherence",       value: f.temporal_score > 0.5 ? "Inconsistent": "Consistent",  description: f.temporal_score > 0.5 ? "Time-based patterns show potential synthesis artifacts"          : "Time-based patterns show natural human speech variation", score: f.temporal_score });
      }
      if (detailsArray.length === 0) detailsArray.push({ label:"Overall Analysis", value: data.is_deepfake ? "Artificial" : "Natural", description: data.is_deepfake ? "AI patterns detected" : "Natural human voice characteristics detected", score: data.confidence_score });

      setAnalysisData({
        id:            data.id,
        date:          formattedDate,
        fileName:      data.metadata?.filename  || "Unknown File",
        result:        data.is_deepfake ? `${Math.round(data.confidence_score * 100)}% Fake` : `${Math.round((1 - data.confidence_score) * 100)}% Real`,
        isAI:          data.is_deepfake,
        confidence:    Math.round(data.confidence_score * 100),
        duration:      data.metadata?.duration  ? `${data.metadata.duration.toFixed(2)}s`                      : "—",
        format:        data.metadata?.filename  ? data.metadata.filename.split(".").pop().toUpperCase()         : "—",
        sampleRate:    data.metadata?.sample_rate ? `${(data.metadata.sample_rate / 1000).toFixed(1)} kHz`     : "—",
        analysisTime:  data.details?.processing_time != null ? data.details.processing_time.toFixed(0)         : "—",
        details:       detailsArray,
        rawData:       data,
      });
    }).catch((err) => {
      console.error(err);
      setError("Failed to load analysis details");
    }).finally(() => setLoading(false));
  }, [id, user, location.state]);

  if (!analysisData && !loading && !error) { navigate("/history"); return null; }

  const handleBack = () => {
    if (analysisData?.rawData?.id) navigate(`/result/${analysisData.rawData.id}`);
    else if (id) navigate(`/result/${id}`);
    else navigate("/history");
  };

  return (
    <div style={{ background: "var(--surface)", minHeight: "100vh" }}>

      {/* ── Top bar ── */}
      <div className="da-topbar">
        <div className="da-topbar-inner">
          <button className="da-back-btn" onClick={handleBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to result
          </button>
          {analysisData && (
            <div className="da-topbar-meta">
              <span className="da-topbar-filename">{analysisData.fileName}</span>
              <span className="da-topbar-dot" />
              <span className="da-topbar-date">{analysisData.date}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="da-state">
          <span className="vg-spinner vg-spinner-dark" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <span>Loading analysis…</span>
        </div>
      ) : error ? (
        <div className="da-state da-state--error">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{error}</span>
          <button onClick={() => navigate("/history")} className="vg-btn vg-btn-primary" style={{ marginTop: 8 }}>
            Return to history
          </button>
        </div>
      ) : (
        <DetailedAnalysis analysisData={analysisData} />
      )}
    </div>
  );
};

export default DetailedAnalysisPage;
