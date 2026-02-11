import React from "react";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// ── Register Chart.js modules once ───────────
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler,
);

// ── Constants ────────────────────────────────
const TIME_LABELS = ["0s", "0.5s", "1s", "1.5s", "2s", "2.5s", "3s", "3.5s", "4s", "4.5s", "5s"];
const GREEN = { border: "rgb(34, 197, 94)", bg: "rgba(34, 197, 94, 0.1)", chip: "bg-green-100 text-green-700", bar: "bg-green-500" };
const RED = { border: "rgb(239, 68, 68)", bg: "rgba(239, 68, 68, 0.1)", chip: "bg-red-100 text-red-700", bar: "bg-red-500" };

const PROBABILITY_CURVES = {
  ai: { human: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6], ai: [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4] },
  human: { human: [0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92, 0.95, 0.97, 0.98], ai: [0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1, 0.08, 0.05, 0.03, 0.02] },
};

const LINE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", labels: { font: { size: 14 }, padding: 20 } },
    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(1)}%` } },
  },
  scales: {
    y: { beginAtZero: true, max: 1, ticks: { callback: (v) => `${(v * 100).toFixed(0)}%` } },
  },
};

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" },
    tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` } },
  },
};

// ── Helpers ──────────────────────────────────
function isNegativeIndicator(value) {
  const lower = value.toLowerCase();
  return lower.includes("artificial") || lower.includes("abnormal") || lower.includes("ai");
}

// ── Small sub-components ─────────────────────
const InfoRow = ({ label, value, valueClass = "" }) => (
  <div className="flex justify-between">
    <span className="text-gray-600">{label}</span>
    <span className={`font-medium ${valueClass}`}>{value}</span>
  </div>
);

const FeatureCard = ({ detail, confidence }) => {
  const negative = isNegativeIndicator(detail.value);
  return (
    <div className="bg-white p-3 rounded shadow-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium text-gray-800">{detail.label}</span>
        <span className={`px-2 py-1 rounded ${negative ? RED.chip : GREEN.chip}`}>{detail.value}</span>
      </div>
      <p className="text-sm text-gray-500 mt-2">{detail.description}</p>
      <div className="mt-3">
        <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden" role="progressbar" aria-valuenow={Math.round(negative ? confidence : 100 - confidence)} aria-valuemin={0} aria-valuemax={100} aria-label={`${detail.label}: ${Math.round(negative ? confidence : 100 - confidence)}%`}>
          <div
            className={`h-full ${negative ? RED.bar : GREEN.bar}`}
            style={{ width: `${negative ? confidence : 100 - confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ── Main component ───────────────────────────
const DetailedAnalysis = ({ analysisData }) => {
  const { isAI, confidence } = analysisData;
  const curves = isAI ? PROBABILITY_CURVES.ai : PROBABILITY_CURVES.human;

  const lineData = {
    labels: TIME_LABELS,
    datasets: [
      { label: "Human Voice Probability", data: curves.human, borderColor: GREEN.border, backgroundColor: GREEN.bg, tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 },
      { label: "AI Voice Probability", data: curves.ai, borderColor: RED.border, backgroundColor: RED.bg, tension: 0.4, fill: true, pointRadius: 4, pointHoverRadius: 6 },
    ],
  };

  const pieData = {
    labels: ["Human", "AI"],
    datasets: [{
      data: isAI ? [100 - confidence, confidence] : [confidence, 100 - confidence],
      backgroundColor: [`${GREEN.bg.replace("0.1", "0.8")}`, `${RED.bg.replace("0.1", "0.8")}`],
      borderColor: [GREEN.border, RED.border],
      borderWidth: 1,
    }],
  };

  const tone = isAI
    ? { bg: "bg-red-50", iconBg: "bg-red-100", iconColor: "text-red-500", titleColor: "text-red-700" }
    : { bg: "bg-green-50", iconBg: "bg-green-100", iconColor: "text-green-500", titleColor: "text-green-700" };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Detailed Analysis</h1>
            <p className="mt-1 text-sm text-gray-500">
              Analysis of {analysisData.fileName} — {analysisData.date}
            </p>
          </div>

          <div className="p-6">
            {/* Summary banner */}
            <div className={`p-4 mb-8 rounded-lg ${tone.bg}`}>
              <div className="flex items-center">
                <div className={`p-3 rounded-full ${tone.iconBg} mr-4`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${tone.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isAI ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
                <div>
                  <h2 className={`text-lg font-semibold ${tone.titleColor}`}>
                    {isAI ? "AI-Generated Voice Detected" : "Human Voice Confirmed"}
                  </h2>
                  <p className="text-sm">
                    Our analysis {isAI ? "detected AI-generated content" : "confirms this is a human voice"} with {confidence}% confidence.
                  </p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Probability Analysis</h2>
                <div className="h-72" aria-label="Voice probability line chart">
                  <Line data={lineData} options={LINE_OPTIONS} />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Confidence Distribution</h2>
                <div className="h-72" aria-label="Confidence distribution pie chart">
                  <Pie data={pieData} options={PIE_OPTIONS} />
                </div>
              </div>
            </div>

            {/* Detail grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Audio Information</h3>
                  <div className="space-y-2">
                    <InfoRow label="File Name" value={analysisData.fileName} />
                    <InfoRow label="Duration" value={analysisData.duration} />
                    <InfoRow label="Format" value={analysisData.format} />
                    <InfoRow label="Sample Rate" value={analysisData.sampleRate} />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Analysis Results</h3>
                  <div className="space-y-2">
                    <InfoRow
                      label="Final Result"
                      value={isAI ? "AI Generated" : "Human Voice"}
                      valueClass={isAI ? "text-red-600" : "text-green-600"}
                    />
                    <InfoRow label="Confidence" value={`${confidence}%`} />
                    <InfoRow label="Analysis Time" value={`${analysisData.analysisTime}ms`} />
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Feature Analysis</h3>
                  <div className="space-y-4">
                    {analysisData.details.map((detail, index) => (
                      <FeatureCard key={index} detail={detail} confidence={confidence} />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Analysis Summary</h3>
                  <p className="text-gray-600">
                    The audio analysis indicates {isAI ? "a high probability of AI-generated content" : "a natural human voice pattern"}.
                    The confidence level of {confidence}% is based on multiple factors including voice pattern analysis,
                    frequency distribution, and background noise assessment.
                  </p>
                  <div className="mt-4 p-3 border-l-4 border-purple-500 bg-purple-50">
                    <p className="text-sm text-purple-700">
                      <strong>Expert Recommendation:</strong>{" "}
                      {isAI
                        ? "This audio appears to be AI-generated. We recommend treating content from this source with caution."
                        : "This audio appears to be from a genuine human source and can be considered reliable."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedAnalysis;
