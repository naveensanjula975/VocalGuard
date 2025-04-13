import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;

  if (!result) {
    navigate("/upload");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Analysis Result</h1>
          
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Audio Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">File Name</p>
                  <p className="font-medium">{result.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{result.duration}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Analysis Result</h2>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.isAI ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{ width: `${result.confidence}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Confidence: {result.confidence}%
                  </p>
                </div>
                <div className={`ml-4 px-4 py-2 rounded-full ${
                  result.isAI 
                    ? "bg-red-100 text-red-800" 
                    : "bg-green-100 text-green-800"
                }`}>
                  {result.isAI ? "AI Generated" : "Human Voice"}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Detailed Analysis</h2>
              <div className="space-y-2">
                {result.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-gray-600">{detail.label}</span>
                    <span className="font-medium">{detail.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => navigate("/upload")}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">
                Upload Another
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700">
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;