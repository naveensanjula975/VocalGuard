import React from "react";

const LoadingSpinner = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-xl flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-700 font-medium">Analyzing Audio...</p>
        <p className="text-sm text-gray-500">This may take a few moments</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
