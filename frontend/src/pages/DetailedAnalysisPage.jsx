import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import DetailedAnalysis from "../components/DetailedAnalysis";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { formatForDetailedComponent } from "../utils/formatAnalysis";

const DetailedAnalysisPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(
    location.state?.analysisData || null,
  );

  // ── Use a ref to capture the initial nav-state without triggering re-fetches ──
  const initialNavState = useRef(location.state?.analysisData);
  const token = user?.token;

  useEffect(() => {
    const fetchAnalysisData = async () => {
      // Skip fetch if we already have data from navigation state
      if (initialNavState.current || !id || !token) return;

      setLoading(true);
      try {
        const data = await api.getAnalysisById(id, token);

        if (!data) {
          setError("Analysis not found");
          setLoading(false);
          return;
        }

        setAnalysisData(formatForDetailedComponent(data));
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setError("Failed to load analysis details");
      }
      setLoading(false);
    };

    fetchAnalysisData();
  }, [id, token]);

  // Redirect to history if no data and not loading
  useEffect(() => {
    if (!analysisData && !loading && !error) {
      navigate("/history");
    }
  }, [analysisData, loading, error, navigate]);

  const handleBackToResult = useCallback(() => {
    const analysisId = analysisData?.rawData?.id || id;
    navigate(analysisId ? `/result/${analysisId}` : "/history");
  }, [analysisData?.rawData?.id, id, navigate]);

  if (!analysisData && !loading && !error) {
    return null;
  }

  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto my-12 p-8 bg-red-50 rounded-lg text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => navigate("/history")}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Return to History
          </button>
        </div>
      ) : analysisData ? (
        <>
          <div className="bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
              <button
                onClick={handleBackToResult}
                className="flex items-center text-purple-600 hover:text-purple-800 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Basic Result
              </button>
            </div>
          </div>
          <DetailedAnalysis analysisData={analysisData} />
        </>
      ) : null}
    </div>
  );
};

export default DetailedAnalysisPage;
