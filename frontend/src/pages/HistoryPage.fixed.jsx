import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demoDataGenerated, setDemoDataGenerated] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Function to format analysis data from API response
  const formatAnalysisData = (analyses) => {
    if (!analyses || !Array.isArray(analyses)) {
      return [];
    }

    return analyses
      .map((analysis) => {
        if (!analysis) return null;

        // Extract and format the timestamp
        const uploadDate = analysis.analysis_timestamp
          ? new Date(analysis.analysis_timestamp)
          : new Date();

        const formattedDate = uploadDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Format the result string
        let confidence = 0;
        try {
          confidence = parseFloat(analysis.confidence_score);
          if (isNaN(confidence)) confidence = 0.5;
          if (confidence < 0) confidence = 0;
          if (confidence > 1) confidence = 1;
        } catch (e) {
          confidence = 0.5;
        }

        const resultText = analysis.is_deepfake
          ? `${Math.round(confidence * 100)}% Fake`
          : `${Math.round((1 - confidence) * 100)}% Real`;

        // Extract audio details
        const detailsArray = [];

        // If we have feature details, add them
        if (analysis.details && analysis.details.feature_scores) {
          const features = analysis.details.feature_scores;

          if (features.mfcc_score !== undefined) {
            detailsArray.push({
              label: "Voice Pattern Analysis",
              value: features.mfcc_score > 0.5 ? "Artificial" : "Natural",
              description:
                features.mfcc_score > 0.5
                  ? "Patterns indicate potential AI generation"
                  : "Patterns match typical human speech characteristics",
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
            });
          }

          if (features.temporal_score !== undefined) {
            detailsArray.push({
              label: "Temporal Analysis",
              value: features.temporal_score > 0.5 ? "Irregular" : "Regular",
              description:
                features.temporal_score > 0.5
                  ? "Temporal patterns suggest artificial generation"
                  : "Natural temporal flow detected in speech",
            });
          }
        }

        // Add default details if none available from API
        if (detailsArray.length === 0) {
          detailsArray.push({
            label: "Overall Analysis",
            value: analysis.is_deepfake ? "Artificial" : "Natural",
            description: analysis.is_deepfake
              ? "AI patterns detected in the audio"
              : "Natural human voice characteristics detected",
          });
        }

        // Safely get values with fallbacks
        const metadata = analysis.metadata || {};
        const details = analysis.details || {};
        let processingTime = null;

        // Handle processing time with proper type checking and error handling
        if (details.processing_time !== undefined) {
          try {
            if (typeof details.processing_time === "string") {
              processingTime = parseInt(details.processing_time);
            } else if (typeof details.processing_time === "number") {
              processingTime = details.processing_time;
            }

            if (isNaN(processingTime)) {
              processingTime = null;
            }
          } catch (e) {
            console.error("Error parsing processing time:", e);
            processingTime = null;
          }
        }

        // For demo data detection - demo data often has a specific pattern
        const isDemoData =
          metadata.filename &&
          [
            "speech_sample_1.wav",
            "interview_clip.mp3",
            "voice_message.m4a",
            "podcast_segment.wav",
          ].includes(metadata.filename);

        return {
          id: analysis.id,
          date: formattedDate,
          fileName: metadata.filename || "Unknown File",
          result: resultText,
          isAI: analysis.is_deepfake,
          confidence: Math.round(confidence * 100),
          duration: metadata.duration
            ? `${parseFloat(metadata.duration).toFixed(2)}s`
            : "Unknown",
          format: metadata.filename
            ? metadata.filename.split(".").pop().toUpperCase()
            : "Unknown",
          sampleRate: metadata.sample_rate
            ? `${(parseFloat(metadata.sample_rate) / 1000).toFixed(1)} kHz`
            : "Unknown",
          analysisTime:
            processingTime !== null
              ? `${processingTime.toFixed(0)} ms`
              : "Unknown",
          details: detailsArray,
          isDemoData: isDemoData, // Flag demo data for special UI treatment
          rawData: analysis, // Keep the raw data for reference
        };
      })
      .filter(Boolean); // Remove any null entries
  };

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        if (!user || !user.token) {
          setError("You must be logged in to view history");
          setLoading(false);
          return;
        }

        // Fetch user's analyses from the API
        const response = await api.getUserAnalyses(user.token);

        if (response.analyses && Array.isArray(response.analyses)) {
          // Transform API data to match our component's expected format
          const formattedData = formatAnalysisData(response.analyses);
          setHistoryData(formattedData);
        } else {
          setHistoryData([]);
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching analyses:", err);
        setError("Failed to load analysis history");
        setLoading(false);
      }
    };

    fetchAnalyses();
    // Reset demo data generated flag when user changes
    setDemoDataGenerated(false);
    setSelectedItems([]);
  }, [user]);

  const handleItemSelect = (id) => {
    setSelectedItems((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.length === filteredHistory.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredHistory.map((item) => item.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.length === 0) return;

    // Currently just showing a modal - in future, implement the actual delete API call
    if (
      window.confirm(
        `Delete ${selectedItems.length} selected items? This action cannot be undone.`
      )
    ) {
      setIsDeleting(true);

      try {
        // For now just show that we would delete these items
        console.log("Would delete these items:", selectedItems);

        // Placeholder for future API implementation
        // await api.deleteAnalyses(selectedItems, user.token);

        // Remove the deleted items from the local state
        setHistoryData((prev) =>
          prev.filter((item) => !selectedItems.includes(item.id))
        );
        setSelectedItems([]);
        alert(
          "Delete functionality has been prepared for implementation, but is not yet active in this version."
        );
      } catch (err) {
        console.error("Error deleting items:", err);
        setError("Failed to delete selected items");
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getResultColor = (result) => {
    if (result.includes("Fake")) {
      return "text-red-500";
    }
    return "text-green-500";
  };

  const handleViewDetails = (item) => {
    // Use the direct route with the ID, which will properly update the URL
    // This allows users to bookmark or share the result directly
    if (item.id) {
      navigate(`/result/${item.id}`);
    } else if (item.analysis_id) {
      navigate(`/result/${item.analysis_id}`);
    } else {
      navigate("/detailed-analysis", { state: { analysisData: item } });
    }
  };

  const handleGenerateDemoData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Generate demo data
      const result = await api.generateDummyData(user.token);
      console.log("Demo data generated:", result);

      // Show the number of generated analyses
      const generatedCount = result.analysis_ids?.length || 0;

      // Wait a moment for Firebase to update
      setTimeout(async () => {
        try {
          // Fetch the updated analyses
          const response = await api.getUserAnalyses(user.token);

          if (response.analyses && Array.isArray(response.analyses)) {
            // Transform API data to match our component's expected format
            const formattedData = formatAnalysisData(response.analyses);
            setHistoryData(formattedData);
            setDemoDataGenerated(true);
          }
          setLoading(false);
        } catch (fetchErr) {
          console.error(
            "Error fetching analyses after demo generation:",
            fetchErr
          );
          setError("Generated demo data but failed to refresh the display");
          setLoading(false);
        }
      }, 1000); // Short delay to ensure Firebase data is ready
    } catch (err) {
      console.error("Error generating dummy data:", err);
      setError(
        "Failed to generate demo data: " + (err.message || "Unknown error")
      );
      setLoading(false);
    }
  };

  // Filter history based on search term
  const filteredHistory = historyData.filter(
    (item) =>
      item.fileName &&
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold mb-2 sm:mb-0">
          Analysis History
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          {selectedItems.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center">
              {isDeleting ? (
                <svg
                  className="animate-spin h-4 w-4 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
              Delete {selectedItems.length} selected
            </button>
          )}
          {user && (
            <button
              onClick={handleGenerateDemoData}
              disabled={loading}
              className={`px-4 py-2 rounded-md transition-colors ${
                loading
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : demoDataGenerated
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
              }`}>
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : demoDataGenerated ? (
                "✓ Demo Data Generated"
              ) : (
                "Generate Demo Data"
              )}
            </button>
          )}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-4 py-2 rounded-full bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <svg
                className="w-5 h-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-center text-red-500">
          <p>{error}</p>
          {!user && (
            <button
              onClick={() => navigate("/login")}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              Login to View History
            </button>
          )}
        </div>
      ) : historyData.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-600 mb-4">
            No Analysis History Found
          </h3>
          <p className="text-gray-500 mb-6">
            You haven't analyzed any audio files yet or no records were found.
          </p>
          {user && !demoDataGenerated && (
            <button
              onClick={handleGenerateDemoData}
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              Generate Demo Data
            </button>
          )}
        </div>
      ) : (
        <div>
          {/* Demo Data Information Banner */}
          {historyData.some((item) => item.isDemoData) && (
            <div className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-purple-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-purple-800 font-medium">Demo Data</span>
              </div>
              <p className="mt-1 text-sm text-purple-700">
                This table includes demonstration data for showcasing
                VocalGuard's audio analysis capabilities. Demo entries are
                marked with a "Demo" badge.
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-10 px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          selectedItems.length === filteredHistory.length &&
                          filteredHistory.length > 0
                        }
                        onChange={handleSelectAll}
                        className="rounded text-purple-600 focus:ring-purple-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredHistory.map((item, index) => (
                    <tr
                      key={item.id || index}
                      className={`hover:bg-purple-50 transition-colors ${
                        selectedItems.includes(item.id) ? "bg-purple-50" : ""
                      }`}>
                      <td className="px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={() => handleItemSelect(item.id)}
                          className="rounded text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.date}
                      </td>
                      <td className="px-4 py-4 text-sm text-blue-600 max-w-[15rem] truncate">
                        <div className="flex items-center">
                          {item.fileName}
                          {item.isDemoData && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                              Demo
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${
                          item.isAI ? "text-red-500" : "text-green-500"
                        }`}>
                        <div className="flex items-center">
                          <span
                            className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              item.isAI ? "bg-red-500" : "bg-green-500"
                            }`}></span>
                          {item.result}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.format}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.duration}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(item)}
                          className="text-purple-600 hover:text-purple-900 mx-2 flex items-center">
                          <svg
                            className="w-5 h-5 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
