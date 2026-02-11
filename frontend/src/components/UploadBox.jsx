import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "./ProgressIndicator";

// ── Constants ────────────────────────────────
const VALID_TYPES = [
  "audio/mp3",
  "audio/flac",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const STATUS_MESSAGES = [
  { threshold: 30, message: "Preparing file..." },
  { threshold: 60, message: "Analyzing audio..." },
  { threshold: 90, message: "Processing results..." },
];

function getStatusMessage(progress) {
  for (const s of STATUS_MESSAGES) {
    if (progress < s.threshold) return s.message;
  }
  return "Almost done...";
}

// ── Component ────────────────────────────────
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
  const progressIntervalRef = useRef(null);

  // ── File validation ────────────────────
  const validateFile = (f) => {
    if (!f) return false;
    if (!VALID_TYPES.includes(f.type)) {
      setError("Please upload only MP3, WAV or FLAC files");
      return false;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File size should be less than 10 MB");
      return false;
    }
    return true;
  };

  // ── Drag & drop handlers ───────────────
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (validateFile(droppedFile)) {
      setFile(droppedFile);
      setError("");
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setError("");
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Progress simulation ────────────────
  const startFakeProgress = (cap = 95) => {
    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= cap) progress = cap;
      setUploadProgress(Math.min(progress, cap));
      setUploadStatus(getStatusMessage(progress));
    }, 500);
  };

  const stopFakeProgress = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // ── Submit ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }
    if (!user?.token) {
      setError("You must be logged in to analyze audio");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Starting upload...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      startFakeProgress(95);

      // Call the appropriate endpoint
      const detectFn = useAdvancedAnalysis
        ? api.detectDeepfakeAdvanced
        : api.detectDeepfake;
      const result = await detectFn(formData, user.token);

      stopFakeProgress();
      setUploadProgress(100);
      setUploadStatus("Complete!");

      // Merge local file info with API response
      const enhancedResult = {
        ...result,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        format: file.type.split("/")[1].toUpperCase(),
        timestamp: new Date().toISOString(),
        modelUsed: useAdvancedAnalysis ? "Wav2Vec2 (Advanced)" : "Standard",
        is_fake: result.is_fake,
        confidence: result.confidence * 100,
      };

      // Navigate after a short visual delay
      setTimeout(() => {
        setIsUploading(false);
        const path = enhancedResult.analysis_id
          ? `/result/${enhancedResult.analysis_id}`
          : "/result";
        navigate(path, { state: { result: enhancedResult } });
      }, 500);
    } catch (err) {
      console.error("Error analyzing audio:", err);
      stopFakeProgress();

      // Map common HTTP errors to user-friendly messages
      const msg = err.message || "";
      if (msg.includes("401")) setError("Authentication error. Please login again.");
      else if (msg.includes("413")) setError("File too large. Please choose a smaller audio file.");
      else if (msg.toLowerCase().includes("network")) setError("Network error. Please check your connection and try again.");
      else setError(msg || "Failed to analyze audio");

      setIsUploading(false);
    }
  };

  // ── Render ─────────────────────────────
  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-64px)] p-8 bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-[500px] mx-auto">
        <h1 className="mb-2 text-2xl font-semibold text-center text-gray-800">
          Upload Audio
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Upload MP3, WAV or FLAC file to analyze
        </p>

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ProgressIndicator progress={uploadProgress} status={uploadStatus} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${isDragging ? "border-purple-500 bg-purple-50" : "border-gray-300 hover:border-purple-500 hover:bg-purple-50"}
                ${file ? "border-solid border-purple-500" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              role="button"
              tabIndex={0}
              aria-label={file ? `Selected file: ${file.name}. Press to change file.` : "Click or drag to upload an audio file"}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.flac"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Choose audio file"
                tabIndex={-1}
              />

              {file ? (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 truncate">{file.name}</span>
                  <button type="button" className="ml-4 text-xl text-gray-500 hover:text-red-500" onClick={clearFile} aria-label={`Remove file ${file.name}`}>
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl">📁</div>
                  <p className="text-gray-600">Drag & Drop your audio file here</p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                </div>
              )}
            </div>

            {error && <div className="text-sm text-center text-red-500" role="alert">{error}</div>}

            {/* Advanced toggle */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center">
                <label htmlFor="advancedAnalysis" className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="advancedAnalysis"
                    className="sr-only peer"
                    checked={useAdvancedAnalysis}
                    onChange={() => setUseAdvancedAnalysis((prev) => !prev)}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-300 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                  <span className="ms-3 text-sm font-medium text-gray-900">
                    Use Advanced Analysis (Wav2Vec2)
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${!file
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                }`}
              disabled={!file}
            >
              Analyze Audio
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UploadBox;
