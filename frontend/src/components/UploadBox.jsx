import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "./ProgressIndicator";

const UploadBox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

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

  const validateFile = (file) => {
    if (!file) return false;

    const validTypes = ["audio/mp3", "audio/flac", "audio/mpeg"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload only MP3 or FLAC files");
      return false;
    }

    // 10MB size limit
    if (file.size > 10 * 1024 * 1024) {
      setError("File size should be less than 10MB");
      return false;
    }

    return true;
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      setError("");
    }
  };

  const simulateProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          navigate("/result", { state: { result: generateDummyResult() } });
        }, 500);
      }
      setUploadProgress(Math.min(progress, 100));
      setUploadStatus(getStatusMessage(progress));
    }, 500);
  };

  const getStatusMessage = (progress) => {
    if (progress < 30) return "Preparing file...";
    if (progress < 60) return "Analyzing audio...";
    if (progress < 90) return "Processing results...";
    return "Almost done...";
  };

  const generateDummyResult = () => {
    return {
      fileName: file.name,
      duration: "2:45",
      fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      format: file.type.split("/")[1].toUpperCase(),
      isAI: Math.random() > 0.5,
      confidence: Math.floor(Math.random() * 30) + 70,
      timestamp: new Date().toISOString(),
      sampleRate: "44.1 kHz",
      bitDepth: "16 bits",
      channels: "2 (Stereo)",
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Starting upload...");
    simulateProgress();
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-64px)] p-8 bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-[500px] mx-auto">
        <h1 className="mb-2 text-2xl font-semibold text-center text-gray-800">
          Upload Audio
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Upload MP3 or FLAC file to analyze
        </p>

        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ProgressIndicator
              progress={uploadProgress}
              status={uploadStatus}
            />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
                ${
                  isDragging
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-300 hover:border-purple-500 hover:bg-purple-50"
                }
                ${file ? "border-solid border-purple-500" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.flac"
                onChange={handleFileSelect}
                className="hidden"
              />
              {file ? (
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 truncate">{file.name}</span>
                  <button
                    type="button"
                    className="ml-4 text-xl text-gray-500 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}>
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl">📁</div>
                  <p className="text-gray-600">
                    Drag & Drop your audio file here
                  </p>
                  <p className="text-sm text-gray-500">or click to browse</p>
                </div>
              )}
            </div>

            {error && (
              <div className="text-sm text-center text-red-500">{error}</div>
            )}

            <button
              type="submit"
              className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200
                ${
                  !file
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                }`}
              disabled={!file}>
              Analyze Audio
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UploadBox;
