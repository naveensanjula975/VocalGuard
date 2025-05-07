import React from "react";

const ProgressIndicator = ({ progress, status }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;
  const roundedProgress = Math.round(progress);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        {/* Background Circle */}
        <svg className="w-24 h-24 transform -rotate-90">
          <circle
            className="text-gray-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="48"
            cy="48"
          />
          {/* Progress Circle */}
          <circle
            className="text-purple-500"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="48"
            cy="48"
          />
        </svg>
        {/* Percentage Text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-semibold text-gray-700">
            {roundedProgress}%
          </span>
        </div>
      </div>
      {/* Status Text */}
      <p className="mt-4 text-sm font-medium text-gray-600">{status}</p>
    </div>
  );
};

export default ProgressIndicator;
