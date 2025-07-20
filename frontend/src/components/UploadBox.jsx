import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";
import ProgressIndicator from "./ProgressIndicator";

const UploadBox = () => {
  const { user } = useAuth();
  const navigate = useNavigate();  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const [useAdvancedAnalysis, setUseAdvancedAnalysis] = useState(false);
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

    const validTypes = [
      "audio/mp3",
      "audio/flac",
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Please upload only MP3, WAV or FLAC files");
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

    if (!user || !user.token) {
      setError("You must be logged in to analyze audio");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Starting upload...");

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);

      // Start progress simulation
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 95) {
          progress = 95; // Cap at 95% until we get actual response
        }
        setUploadProgress(Math.min(progress, 95));
        setUploadStatus(getStatusMessage(progress));
      }, 500);      // Make actual API call using standard or advanced endpoint
      let result;
      if (useAdvancedAnalysis) {
        result = await api.detectDeepfakeAdvanced(formData, user.token);
      } else {
        result = await api.detectDeepfake(formData, user.token);
      }

      // Stop progress simulation
      clearInterval(interval);
      setUploadProgress(100);
      setUploadStatus("Complete!"); 
      
      // Enhance result with local file details and Firebase IDs
      const enhancedResult = {
        ...result,
        fileName: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        format: file.type.split("/")[1].toUpperCase(),
        timestamp: new Date().toISOString(),
        modelUsed: useAdvancedAnalysis ? 'Wav2Vec2 (Advanced)' : 'Standard',

        // Use Firebase IDs directly from API response for history linking
        metadata_id: result.metadata_id,
        analysis_id: result.analysis_id,
        details_id: result.details_id,

        // Transform Firebase results for component compatibility
        is_fake: result.is_fake,
        confidence: result.confidence * 100,
      };

      console.log("Analysis complete, result:", enhancedResult);

      // Navigate to result page with real data
      setTimeout(() => {
        setIsUploading(false);
        if (enhancedResult.analysis_id) {
          // If we have an analysis ID, use the direct route for better history integration
          navigate(`/result/${enhancedResult.analysis_id}`, {
            state: { result: enhancedResult },
          });
        } else {
          navigate("/result", { state: { result: enhancedResult } });
        }
      }, 500);
    } catch (err) {
      console.error("Error analyzing audio:", err);

      // Clear the progress simulation
      clearInterval(interval);

      // Show specific error messages to help the user troubleshoot
      if (err.message && err.message.includes("401")) {
        setError("Authentication error. Please login again.");
      } else if (err.message && err.message.includes("413")) {
        setError("File too large. Please choose a smaller audio file.");
      } else if (err.message && err.message.includes("network")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(err.message || "Failed to analyze audio");
      }

      setIsUploading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-64px)] p-8 bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-[500px] mx-auto">
        {" "}
        <h1 className="mb-2 text-2xl font-semibold text-center text-gray-800">
          Upload Audio
        </h1>
        <p className="mb-8 text-center text-gray-600">
          Upload MP3, WAV or FLAC file to analyze
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
              {" "}              <input
                ref={fileInputRef}
                type="file"
                accept=".mp3,.wav,.flac"
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
              <div className="flex flex-col gap-3">              <div className="flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={useAdvancedAnalysis}
                    onChange={() => {
                      setUseAdvancedAnalysis(!useAdvancedAnalysis);
                    }}
                  />
                  <div className="relative w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-purple-300 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  <span className="ms-3 text-sm font-medium text-gray-900">Use Advanced Analysis (Wav2Vec2)</span>
                </label>
                
                {useAdvancedAnalysis && (
                  <div className="ml-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-purple-600" data-tooltip-target="tooltip-advanced">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div id="tooltip-advanced" role="tooltip" className="absolute z-10 invisible inline-block px-3 py-2 text-sm font-medium text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip">
                      Uses Wav2Vec2 neural network model for more accurate analysis. May take longer to process.
                      <div className="tooltip-arrow" data-popper-arrow></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
