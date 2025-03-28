import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/UploadBox.css";
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
    <div className="upload-container">
      <div className="upload-box">
        <h1 className="upload-title">Upload Audio</h1>
        <p className="upload-subtitle">Upload MP3 or FLAC file to analyze</p>

        <form onSubmit={handleSubmit} className="upload-form">
          <div
            className={`drop-zone ${isDragging ? "dragging" : ""} ${
              file ? "has-file" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.flac"
              onChange={handleFileSelect}
              className="hidden-input"
            />
            {file ? (
              <div className="file-info">
                <span className="file-name">{file.name}</span>
                <button
                  type="button"
                  className="remove-file"
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
              <div className="drop-zone-content">
                <div className="upload-icon">📁</div>
                <p>Drag & Drop your audio file here</p>
                <p>or click to browse</p>
              </div>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            className="upload-button"
            disabled={!file || isLoading}>
            {isLoading ? "Uploading..." : "Analyze Audio"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadBox;
