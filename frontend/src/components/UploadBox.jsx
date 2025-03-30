import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

const UploadBox = () => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user.userId);

      await api.uploadFile(formData, user.token);

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Failed to upload file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center w-full min-h-[calc(100vh-64px)] p-8 bg-gray-50">
      <div className="bg-white p-10 rounded-2xl shadow-lg w-full max-w-[500px] mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-2 text-center">
          Upload Audio
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Upload MP3 or FLAC file to analyze
        </p>

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
                  className="ml-4 text-gray-500 hover:text-red-500 text-xl"
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
                <p className="text-gray-500 text-sm">or click to browse</p>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200
              ${
                !file || isLoading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              }`}
            disabled={!file || isLoading}>
            {isLoading ? "Uploading..." : "Analyze Audio"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadBox;
