import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";

const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

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
          const formattedData = response.analyses.map((analysis) => {
            // Extract metadata date and format it
            const uploadDate = new Date(analysis.upload_timestamp);
            const formattedDate = uploadDate.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            // Format the result string
            const resultText = analysis.is_deepfake
              ? `${Math.round(analysis.confidence_score * 100)}% Fake`
              : `${Math.round((1 - analysis.confidence_score) * 100)}% Real`;

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

            return {
              id: analysis.id,
              date: formattedDate,
              fileName: analysis.metadata
                ? analysis.metadata.filename
                : "Unknown File",
              result: resultText,
              isAI: analysis.is_deepfake,
              confidence: Math.round(analysis.confidence_score * 100),
              duration: analysis.metadata
                ? `${analysis.metadata.duration.toFixed(2)}s`
                : "Unknown",
              format: analysis.metadata
                ? analysis.metadata.filename.split(".").pop().toUpperCase()
                : "Unknown",
              sampleRate: analysis.metadata
                ? `${(analysis.metadata.sample_rate / 1000).toFixed(1)} kHz`
                : "Unknown",
              analysisTime: analysis.details
                ? analysis.details.processing_time.toFixed(0)
                : "Unknown",
              details: detailsArray,
              rawData: analysis, // Keep the raw data for reference
            };
          });

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
  }, [user]);

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
  // Filter history based on search term
  const filteredHistory = historyData.filter(
    (item) =>
      item.fileName &&
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold">History</h1>
        <div className="flex items-center space-x-4">
          {user && (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await api.generateDummyData(user.token);
                  const response = await api.getUserAnalyses(user.token);
                  setHistoryData(response.analyses || []);
                } catch (err) {
                  console.error("Error generating dummy data:", err);
                  setError("Failed to generate demo data");
                }
                setLoading(false);
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              Generate Demo Data
            </button>
          )}
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
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
          {user && (
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  await api.generateDummyData(user.token);
                  const response = await api.getUserAnalyses(user.token);
                  setHistoryData(response.analyses || []);
                } catch (err) {
                  console.error("Error generating dummy data:", err);
                  setError("Failed to generate demo data");
                }
                setLoading(false);
              }}
              className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              Generate Demo Data
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-purple-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    {item.fileName}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm ${getResultColor(
                      item.result
                    )}`}>
                    {item.result}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleViewDetails(item)}
                      className="text-purple-600 hover:text-purple-900 mx-2">
                      <svg
                        className="w-5 h-5"
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
                    </button>
                    <button
                      className="text-red-600 hover:text-red-900"
                      onClick={() =>
                        alert("Delete functionality not implemented yet")
                      }>
                      <svg
                        className="w-5 h-5"
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
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
