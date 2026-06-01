import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "./ProgressIndicator";
import "../styles/design-tokens.css";
import "./UploadBox.css";
import "./ProgressIndicator.css";

const UploadBox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const [useAdvancedAnalysis, setUseAdvancedAnalysis] = useState(false);
  const fileInputRef = useRef(null);

  const validateFile = (f) => {
    if (!f) return false;
    const validTypes = ["audio/mp3","audio/flac","audio/mpeg","audio/wav","audio/x-wav","audio/wave"];
    if (!validTypes.includes(f.type)) { setError("Please upload MP3, WAV, or FLAC files only"); return false; }
    if (f.size > 10 * 1024 * 1024) { setError("File size must be under 10 MB"); return false; }
    return true;
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (validateFile(f)) { setFile(f); setError(""); }
  };
  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (validateFile(f)) { setFile(f); setError(""); }
  };

  const getStatusMessage = (p) => {
    if (p < 25) return "Uploading file…";
    if (p < 55) return "Extracting features…";
    if (p < 80) return "Running neural analysis…";
    if (p < 96) return "Computing confidence score…";
    return "Finalising…";
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError("Please select a file"); return; }
    if (!user?.token) { setError("You must be logged in to analyse audio"); return; }
    setIsUploading(true); setUploadProgress(0); setUploadStatus("Starting upload…");

    const formData = new FormData();
    formData.append("file", file);
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 95) progress = 95;
      setUploadProgress(Math.min(progress, 95));
      setUploadStatus(getStatusMessage(progress));
    }, 500);

    try {
      const result = useAdvancedAnalysis
        ? await api.detectDeepfakeAdvanced(formData, user.token)
        : await api.detectDeepfake(formData, user.token);
      clearInterval(interval);
      setUploadProgress(100); setUploadStatus("Complete!");
      const enhanced = {
        ...result,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        format: file.type.split("/")[1].toUpperCase(),
        timestamp: new Date().toISOString(),
        modelUsed: useAdvancedAnalysis ? "Wav2Vec2 (Advanced)" : "Standard",
        metadata_id: result.metadata_id,
        analysis_id: result.analysis_id,
        details_id: result.details_id,
        is_fake: result.is_fake,
        confidence: result.confidence * 100,
      };
      setTimeout(() => {
        setIsUploading(false);
        if (enhanced.analysis_id) navigate(`/result/${enhanced.analysis_id}`, { state: { result: enhanced } });
        else navigate("/result", { state: { result: enhanced } });
      }, 500);
    } catch (err) {
      clearInterval(interval);
      if (err.message?.includes("401")) setError("Authentication error. Please log in again.");
      else if (err.message?.includes("413")) setError("File too large. Please use a file under 10 MB.");
      else if (err.message?.includes("network")) setError("Network error. Check your connection and retry.");
      else setError(err.message || "Failed to analyse audio. Please try again.");
      setIsUploading(false);
    }
  };

  const ext = file?.name.split(".").pop()?.toUpperCase();
  const audioExt = ["MP3","WAV","FLAC"].includes(ext) ? ext : null;

  return (
    <div className="upload-page vg-page">
      <div className="upload-container">

        {/* Header */}
        <div className="upload-header vg-anim-1">
          <div className="vg-section-eyebrow">Audio Analysis</div>
          <h1 className="upload-title">Upload your audio file</h1>
          <p className="upload-subtitle">
            Supported: MP3, WAV, FLAC · Max 10 MB · Results in under 2 seconds
          </p>
        </div>

        <div className="upload-card vg-card vg-anim-2">
          {isUploading ? (
            <div className="upload-progress-wrap">
              <ProgressIndicator progress={uploadProgress} status={uploadStatus} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="upload-form">

              {/* Drop zone */}
              <div
                className={`upload-dropzone${isDragging ? " upload-dropzone--drag" : ""}${file ? " upload-dropzone--filled" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept=".mp3,.wav,.flac" onChange={handleFileSelect} className="upload-hidden-input" />

                {file ? (
                  <div className="upload-file-preview">
                    <div className="upload-file-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                      </svg>
                    </div>
                    <div className="upload-file-info">
                      <span className="upload-file-name">{file.name}</span>
                      <span className="upload-file-meta">{formatFileSize(file.size)}{audioExt && ` · ${audioExt}`}</span>
                    </div>
                    <button
                      type="button"
                      className="upload-file-remove"
                      onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      aria-label="Remove file"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="upload-dropzone-idle">
                    <div className="upload-dropzone-icon">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                    </div>
                    <p className="upload-dropzone-title">Drop your file here</p>
                    <p className="upload-dropzone-sub">or <span className="upload-dropzone-browse">browse</span> to choose</p>
                    <div className="upload-format-pills">
                      {["MP3","WAV","FLAC"].map(f => <span key={f} className="upload-format-pill">{f}</span>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="auth-error" style={{ borderRadius: "var(--r-md)" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Advanced toggle */}
              <div className="upload-options">
                <label className="vg-toggle-row">
                  <span className="vg-toggle">
                    <input type="checkbox" checked={useAdvancedAnalysis} onChange={() => setUseAdvancedAnalysis(v => !v)} />
                    <span className="vg-toggle-track" />
                  </span>
                  <span className="vg-toggle-label">
                    Use Wav2Vec2 Advanced Analysis
                    {useAdvancedAnalysis && <span className="upload-advanced-badge">More accurate</span>}
                  </span>
                </label>
                {useAdvancedAnalysis && (
                  <p className="upload-advanced-hint">
                    Wav2Vec2-XLSR neural network — higher accuracy, may take 1–2s longer.
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className={`vg-btn vg-btn-primary upload-submit${!file ? " upload-submit--disabled" : ""}`}
                disabled={!file}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Analyse Audio
              </button>

            </form>
          )}
        </div>

        {/* Info row */}
        <div className="upload-info-row vg-anim-3">
          {[
            { icon: "🔒", text: "Files are processed in-memory and never stored without consent" },
            { icon: "⚡", text: "Sub-2-second inference on standard hardware" },
            { icon: "🎯", text: "97.4% accuracy on benchmark datasets" },
          ].map(i => (
            <div className="upload-info-item" key={i.text}>
              <span>{i.icon}</span>
              <span>{i.text}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default UploadBox;
