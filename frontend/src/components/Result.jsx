import React from "react";

export default function Result() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-normal mb-8">Audio Analysis Results</h1>
      <div className="bg-purple-100 rounded-lg p-6 mb-8">
        <p className="text-2xl font-light">
          Here are the results for the uploaded audio file...
        </p>
      </div>

      <div className="bg-gray-100 rounded-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center">
            <div className="w-1/3 text-lg font-semibold text-right pr-4">
              File Name :
            </div>
            <div className="w-2/3 text-lg">audio_clip_01.wav</div>
          </div>
          <div className="flex items-center">
            <div className="w-1/3 text-lg font-semibold text-right pr-4">
              Duration :
            </div>
            <div className="w-2/3 text-lg">3 minutes 12 seconds</div>
          </div>
          <div className="flex items-center">
            <div className="w-1/3 text-lg font-semibold text-right pr-4">
              Date :
            </div>
            <div className="w-2/3 text-lg">Feb 7, 2025</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="text-lg font-medium">High</div>
        <div className="flex gap-4">
          <div className="h-4 w-32 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
          <div className="h-4 w-32 bg-gradient-to-r from-purple-300 to-purple-400 rounded"></div>
        </div>
        <div className="text-lg font-medium">Low</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="flex items-center gap-4">
          <h4 className="text-xl font-medium">Original :</h4>
          <div className="text-2xl font-bold text-purple-600">80%</div>
        </div>
        <div className="flex items-center gap-4">
          <h4 className="text-xl font-medium">AI :</h4>
          <div className="text-2xl font-bold text-pink-600">20%</div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
          Check History
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-pink-700 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2">
          Download Report
        </button>
        <button className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
          Upload Another File
        </button>
      </div>
    </div>
  );
}