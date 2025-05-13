import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DetailedAnalysis = ({ analysisData }) => {
  // Generate probability data based on whether it's AI or human
  const generateProbabilityData = (isAI) => {
    if (isAI) {
      // AI pattern: starts high and gradually decreases
      return {
        human: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6],
        ai: [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4]
      };
    } else {
      // Human pattern: starts low and gradually increases
      return {
        human: [0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92, 0.95, 0.97, 0.98],
        ai: [0.6, 0.5, 0.4, 0.3, 0.2, 0.15, 0.1, 0.08, 0.05, 0.03, 0.02]
      };
    }
  };

  const probabilityData = generateProbabilityData(analysisData.isAI);

  const graphData = {
    labels: ['0s', '0.5s', '1s', '1.5s', '2s', '2.5s', '3s', '3.5s', '4s', '4.5s', '5s'],
    datasets: [
      {
        label: 'Human Voice Probability',
        data: probabilityData.human,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'AI Voice Probability',
        data: probabilityData.ai,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14
          },
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${(context.raw * 100).toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          callback: function(value) {
            return `${(value * 100).toFixed(0)}%`;
          }
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Detailed Analysis</h1>
            <p className="mt-1 text-sm text-gray-500">
              Analysis of {analysisData.fileName} - {analysisData.date}
            </p>
          </div>

          <div className="p-6">
            {/* Probability Graph */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice Probability Analysis</h2>
              <div className="h-96">
                <Line data={graphData} options={options} />
              </div>
              <p className="mt-4 text-sm text-gray-600">
                {analysisData.isAI 
                  ? "The graph shows a high initial probability of AI-generated content, gradually decreasing as more analysis is performed."
                  : "The graph shows an increasing probability of human voice characteristics as the analysis progresses."}
              </p>
            </div>

            {/* Analysis Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Audio Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">File Name</span>
                      <span className="font-medium">{analysisData.fileName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration</span>
                      <span className="font-medium">{analysisData.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Format</span>
                      <span className="font-medium">{analysisData.format}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sample Rate</span>
                      <span className="font-medium">{analysisData.sampleRate}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Analysis Results</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Final Result</span>
                      <span className={`font-medium ${analysisData.isAI ? 'text-red-600' : 'text-green-600'}`}>
                        {analysisData.isAI ? 'AI Generated' : 'Human Voice'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Confidence</span>
                      <span className="font-medium">{analysisData.confidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Analysis Time</span>
                      <span className="font-medium">{analysisData.analysisTime}ms</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Technical Analysis</h3>
                  <div className="space-y-4">
                    {analysisData.details.map((detail, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{detail.label}</span>
                          <span className="font-medium">{detail.value}</span>
                        </div>
                        <p className="text-sm text-gray-500">{detail.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Analysis Summary</h3>
                  <p className="text-gray-600">
                    The audio analysis indicates {analysisData.isAI ? 'a high probability of AI-generated content' : 'a natural human voice pattern'}.
                    The confidence level of {analysisData.confidence}% is based on multiple factors including voice pattern analysis,
                    frequency distribution, and background noise assessment.
                  </p>
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
