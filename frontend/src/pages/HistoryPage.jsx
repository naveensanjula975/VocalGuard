import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sortDirection, setSortDirection] = useState("desc"); // "asc" or "desc"
  const navigate = useNavigate();
  const { user } = useAuth();

  // Function to format analysis data from API response
  const formatAnalysisData = (analyses) => {
    if (!analyses || !Array.isArray(analyses)) {
      return [];
    }

    console.log("Formatting analysis data:", analyses);

    return analyses
      .map((analysis) => {
        if (!analysis) return null;

        // Debug: Log each analysis structure
        console.log("Processing analysis:", analysis);

        // The metadata is merged with analysis data at the top level
        // No need to access analysis.metadata, data is directly in analysis

        // Extract and format the timestamp
        let uploadDate;
        try {
          uploadDate = analysis.analysis_timestamp
            ? new Date(analysis.analysis_timestamp)
            : new Date();
          
          // Check if date is valid
          if (isNaN(uploadDate.getTime())) {
            uploadDate = new Date(); // fallback to current date
          }
        } catch (e) {
          uploadDate = new Date(); // fallback to current date
        }

        const formattedDate = uploadDate.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) + ", " + uploadDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }); // Format the result string
        let confidence = 0;
        try {
          confidence = parseFloat(analysis.confidence_score);
          if (isNaN(confidence)) confidence = 0.5;
          if (confidence < 0) confidence = 0;
          if (confidence > 1) confidence = 1;
        } catch (e) {
          confidence = 0.5;
        }

        let resultText = analysis.is_deepfake
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

        let isAI = analysis.is_deepfake;

        // Debug: Log the filename extraction
        console.log("Filename from analysis:", analysis.filename);
        console.log("Duration from analysis:", analysis.duration);
        console.log("Sample rate from analysis:", analysis.sample_rate);

        return {
          id: analysis.id,
          date: formattedDate,
          fileName: analysis.filename || "Unknown File", // Direct access to filename
          result: resultText,
          isAI: isAI,
          confidence: Math.round(confidence * 100),
          duration: analysis.duration
            ? `${parseFloat(analysis.duration).toFixed(2)}s`
            : "Unknown",
          format: analysis.filename
            ? analysis.filename.split(".").pop().toUpperCase()
            : "Unknown",
          sampleRate: analysis.sample_rate
            ? `${(parseFloat(analysis.sample_rate) / 1000).toFixed(1)} kHz`
            : "Unknown",
          analysisTime:
            processingTime !== null
              ? `${processingTime.toFixed(0)} ms`
              : "Unknown",
          details: detailsArray,
          rawData: analysis, // Keep the raw data for reference
          timestamp: uploadDate, // Store the actual date object for sorting
        };
      })
      .filter(Boolean) // Remove any null entries
      .sort((a, b) => {
        // Sort by timestamp in descending order (newest first)
        // Handle cases where timestamp might be undefined or null
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        return timeB - timeA;
      });
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
          // Debug: Log the first analysis to see the structure
          if (response.analyses.length > 0) {
            console.log("Sample analysis structure:", response.analyses[0]);
          }
          
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
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAnalyses(selectedItems, user.token);
      setHistoryData((prev) =>
        prev.filter((item) => !selectedItems.includes(item.id))
      );
      setSelectedItems([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Error deleting items:", err);
      setError("Failed to delete selected items");
    } finally {
      setIsDeleting(false);
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

  // Function to toggle date sorting
  const toggleDateSort = () => {
    const newDirection = sortDirection === "desc" ? "asc" : "desc";
    setSortDirection(newDirection);
    
    setHistoryData(prev => {
      const sorted = [...prev].sort((a, b) => {
        // Handle cases where timestamp might be undefined or null
        const timeA = a.timestamp ? a.timestamp.getTime() : 0;
        const timeB = b.timestamp ? b.timestamp.getTime() : 0;
        
        if (newDirection === "desc") {
          return timeB - timeA;
        } else {
          return timeA - timeB;
        }
      });
      return sorted;
    });
  };

  // Filter history based on search term
  const filteredHistory = historyData.filter(
    (item) =>
      item.fileName &&
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center animate-fade-in">
            <svg className="mx-auto mb-4 w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Delete {selectedItems.length} selected item{selectedItems.length > 1 ? 's' : ''}?</h2>
            <p className="text-gray-600 mb-6">This action cannot be undone. Are you sure you want to permanently delete the selected analysis{selectedItems.length > 1 ? 'es' : ''}?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-60">
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-5 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
        </div>
      ) : (
        <div>
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
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={toggleDateSort}
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date</span>
                        <svg 
                          className={`w-4 h-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
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
