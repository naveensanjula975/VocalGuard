import React, { useMemo } from "react";

const ProgressIndicator = React.memo(({ progress, status }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  // ── Memoize derived calculations ───────────
  const { progressOffset, roundedProgress } = useMemo(() => ({
    progressOffset: circumference - (progress / 100) * circumference,
    roundedProgress: Math.round(progress),
  }), [progress, circumference]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative">
        {/* Progress ring */}
        <svg
          className="w-24 h-24 transform -rotate-90"
          role="progressbar"
          aria-valuenow={roundedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Upload progress: ${roundedProgress}%`}
        >
          <circle
            className="text-gray-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r={radius}
            cx="48"
            cy="48"
          />
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
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="text-xl font-semibold text-gray-700">
            {roundedProgress}%
          </span>
        </div>
      </div>
      {/* Status Text */}
      <p className="mt-4 text-sm font-medium text-gray-600" aria-live="polite">{status}</p>
    </div>
  );
});

ProgressIndicator.displayName = "ProgressIndicator";

export default ProgressIndicator;
