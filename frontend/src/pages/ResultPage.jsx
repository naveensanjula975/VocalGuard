import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { formatForResultComponent } from "../utils/formatAnalysis";
import Result from "../components/Result";

export default function ResultPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const location = useLocation();
  const { id } = useParams();
  const { user } = useAuth();

  // Result data passed directly from upload flow
  const initialResult = location.state?.result;

  useEffect(() => {
    if (initialResult) {
      setAnalysisData(initialResult);
      return;
    }

    const fetchAnalysis = async () => {
      if (!id || !user?.token) return;
      setLoading(true);
      try {
        const data = await api.getAnalysisById(id, user.token);
        if (data) {
          setAnalysisData(formatForResultComponent(data));
        }
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setError("Failed to load analysis details");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id, user, initialResult]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <Result result={analysisData} />
    </div>
  );
}
