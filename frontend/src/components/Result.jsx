import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import domtoimage from "dom-to-image";
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
} from "react-share";

// Dummy data for demonstration as a fallback
const dummyResult = {
  fileName: "sample_audio.mp3",
  duration: "2:45",
  fileSize: "3.2 MB",
  format: "MP3",
  is_fake: false,
  confidence: 0.95,
  probability: 0.05,
  timestamp: new Date().toISOString(),
  metadata_id: "demo-id-1234",
  analysis_id: "demo-analysis-5678",
  details_id: "demo-details-9012",
  sampleRate: "44.1 kHz",
  analysisTime: "2450",
  modelUsed: "Standard",
  details: [
    {
      label: "Voice Pattern Analysis",
      value: "Natural",
      description: "Patterns match typical human speech characteristics",
    },
    {
      label: "Frequency Analysis",
      value: "Normal",
      description: "Frequency distribution within expected human range",
    },
    {
      label: "Background Noise",
      value: "Low",
      description: "Minimal background noise detected",
    },
    {
      label: "Speech Clarity",
      value: "High",
      description: "Clear and distinct speech patterns",
    },
  ],
};

const Result = ({ result: propResult }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = propResult || location.state?.result || dummyResult;
  const pdfRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!result) {
    navigate("/upload");
    return null;
  }

  const shareUrl = window.location.href;
  const shareTitle = `VocalGuard Analysis Result: ${
    result.is_fake ? "AI Generated" : "Human Voice"
  }`;

  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      console.log("Starting PDF generation...");

      if (!pdfRef.current) {
        throw new Error("PDF reference not found");
      }

      const element = pdfRef.current;
      console.log("Capturing element...");

      // Create a temporary container for PDF generation
      const tempContainer = document.createElement("div");
      tempContainer.style.width = "800px"; // Fixed width for PDF
      tempContainer.style.padding = "20px";
      tempContainer.style.backgroundColor = "#ffffff";

      // Clone the content without share buttons
      const content = element.cloneNode(true);
      const shareSection = content.querySelector(".react-share__ShareButton");
      if (shareSection) {
        shareSection.remove();
      }

      tempContainer.appendChild(content);
      document.body.appendChild(tempContainer);

      // Use dom-to-image to capture the element
      const dataUrl = await domtoimage.toPng(tempContainer, {
        quality: 1.0,
        bgcolor: "#ffffff",
        style: {
          transform: "scale(1)",
          "transform-origin": "top left",
          width: "800px",
          height: "auto",
        },
      });

      // Clean up
      document.body.removeChild(tempContainer);

      console.log("Image captured, creating PDF...");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        putOnlyUsedFonts: true,
        floatPrecision: 16,
      });

      // Calculate dimensions to fit on one page
      const imgWidth = 190; // Slightly less than A4 width to account for margins
      const imgHeight = (tempContainer.offsetHeight * imgWidth) / 800; // Maintain aspect ratio

      // Add the image to the PDF
      pdf.addImage(dataUrl, "PNG", 10, 10, imgWidth, imgHeight);

      // Add metadata
      pdf.setProperties({
        title: "VocalGuard Analysis Report",
        subject: "Voice Authentication Analysis",
        author: "VocalGuard System",
        keywords: "voice, authentication, analysis, report",
        creator: "VocalGuard",
      });

      console.log("PDF generated, saving...");

      // Save the PDF
      const fileName = `vocalguard-analysis-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      pdf.save(fileName);

      console.log("PDF saved successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again or contact support.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div ref={pdfRef} className="p-6 bg-white rounded-lg shadow">
          {/* Header with Logo */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                VocalGuard Analysis Report
              </h1>
              <p className="text-sm text-gray-500">
                Voice Authentication System
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Analysis Date:</span>
              <span className="font-medium">
                {formatDate(result.timestamp)}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Audio Details Section */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Audio Details
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">File Name</p>
                  <p className="font-medium">{result.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{result.duration}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">File Size</p>
                  <p className="font-medium">{result.fileSize}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Format</p>
                  <p className="font-medium">{result.format}</p>
                </div>
              </div>
            </div>{" "}
            {/* Analysis Result Section */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Analysis Result
              </h2>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-2 overflow-hidden bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.is_fake ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{
                        width: `${
                          result.confidence ? result.confidence * 100 : 0
                        }%`,
                      }}></div>
                  </div>{" "}
                  <p className="mt-2 text-sm text-gray-500">
                    Confidence:{" "}
                    {result.confidence !== undefined
                      ? typeof result.confidence === "number" &&
                        result.confidence <= 1
                        ? `${Math.round(result.confidence * 100)}%`
                        : `${Math.round(result.confidence)}%`
                      : "N/A"}
                  </p>
                </div>
                <div
                  className={`ml-4 px-4 py-2 rounded-full ${
                    result.is_fake
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}>
                  {result.is_fake ? "AI Generated" : "Human Voice"}
                </div>
              </div>{" "}
              {/* Analysis IDs - Show for logged-in users and for debugging */}
              {(result.metadata_id || result.analysis_id) && (
                <div className="mt-3 text-xs text-gray-400">
                  <p>
                    Analysis Reference:{" "}
                    {result.analysis_id
                      ? result.analysis_id.substring(0, 8) + "..."
                      : "Not stored yet"}
                  </p>
                  <p className="text-xs text-gray-300">
                    You can access this analysis later from your history page.
                  </p>
                </div>
              )}
            </div>
            {/* Detailed Analysis Section */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Detailed Analysis
              </h2>
              <div className="grid grid-cols-2 gap-3">                {/* Handle standard details */}
                {(Array.isArray(result.details) ? result.details : []).map(
                  (detail, index) => (
                    <div
                      key={index}
                      className="p-3 bg-white rounded-lg shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {detail.label}
                        </span>
                        <span className="text-gray-600">{detail.value}</span>
                      </div>
                      {detail.description && (
                        <p className="mt-1 text-sm text-gray-500">
                          {detail.description}
                        </p>
                      )}
                    </div>
                  )
                )}
                
                {/* Handle WAV2VEC2 probabilities if present */}
                {result.probabilities && Object.entries(result.probabilities).map(
                  ([key, value], index) => (
                    <div
                      key={`wav2vec2-${index}`}
                      className={`p-3 bg-white rounded-lg shadow-sm border-l-4 ${
                        key === 'fake' ? 'border-red-500' : 'border-green-500'
                      }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {key === 'fake' ? 'AI Voice Probability' : 'Human Voice Probability'}
                        </span>
                        <span className={`${key === 'fake' ? 'text-red-600' : 'text-green-600'} font-semibold`}>
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full mt-2 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${key === 'fake' ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{ width: `${(value * 100)}%` }}
                        ></div>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {key === 'fake' 
                          ? 'Likelihood this audio was generated by AI' 
                          : 'Likelihood this audio is from a human voice'}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
            {/* Technical Analysis Section */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Technical Analysis
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Sample Rate</p>
                  <p className="font-medium">{result.sampleRate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Bit Depth</p>
                  <p className="font-medium">{result.bitDepth}</p>
                </div>{" "}
                <div>
                  <p className="text-sm text-gray-500">Channels</p>
                  <p className="font-medium">{result.channels}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Analysis Time</p>
                  <p className="font-medium">{result.analysisTime} ms</p>
                </div>                <div>                  <p className="text-sm text-gray-500">Model Used</p>
                  <p className="font-medium">
                    {result.model_used || result.modelUsed || "Standard"}
                    {(result.model_used === "wav2vec2-xlsr-deepfake" || 
                      result.modelUsed === "wav2vec2-xlsr-deepfake") && (
                      <span className="inline-flex ml-1 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        Advanced AI
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>            {/* Action Buttons */}
            <div className="flex flex-wrap justify-end gap-3 mt-6">
              {result.analysis_id && (
                <button
                  onClick={() => navigate(`/analysis/${result.analysis_id}`)}
                  title="View advanced visualization and detailed feature analysis"
                  className="relative flex items-center justify-center gap-2 px-4 py-2.5 font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transform transition-all duration-200 shadow-sm hover:shadow-md group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                  </svg>
                  Detailed Analysis
                  <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1 text-xs font-medium text-white bg-gray-800 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg z-10">
                    See advanced visualizations and in-depth feature analysis
                  </span>
                </button>
              )}              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 font-medium text-white rounded-lg shadow-sm transition-all duration-200 ${
                  isGeneratingPDF
                    ? "bg-teal-400 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700 active:bg-teal-800 hover:shadow-md"
                }`}
                title="Download a PDF copy of this report">
                {isGeneratingPDF ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download PDF
                  </>
                )}
              </button>              <button
                onClick={() => navigate("/upload")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 transition-all duration-200 shadow-sm hover:shadow-md"
                title="Upload a new audio file for analysis">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Upload Another
              </button>              <button
                onClick={() => navigate("/")}
                className="flex items-center justify-center gap-2 px-4 py-2.5 font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 active:bg-purple-800 transform transition-all duration-200 shadow-sm hover:shadow-md"
                title="Return to the homepage">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Back to Home
              </button>
            </div>            {/* Share Section - This will be excluded from PDF */}
            <div className="pt-6 mt-8 border-t border-gray-200 react-share__ShareButton">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share Results
              </h3>
              <div className="flex flex-wrap gap-4">
                <FacebookShareButton url={shareUrl} quote={shareTitle} className="transition-transform hover:scale-110">
                  <FacebookIcon size={40} round />
                </FacebookShareButton>
                <TwitterShareButton url={shareUrl} title={shareTitle} className="transition-transform hover:scale-110">
                  <TwitterIcon size={40} round />
                </TwitterShareButton>
                <WhatsappShareButton url={shareUrl} title={shareTitle} className="transition-transform hover:scale-110">
                  <WhatsappIcon size={40} round />
                </WhatsappShareButton>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    // Add a more user-friendly notification using state
                    const notification = document.createElement('div');
                    notification.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300';
                    notification.textContent = 'Link copied to clipboard!';
                    document.body.appendChild(notification);
                    setTimeout(() => {
                      notification.style.opacity = '0';
                      setTimeout(() => document.body.removeChild(notification), 300);
                    }, 2000);
                  }}
                  className="flex items-center justify-center w-10 h-10 text-white bg-gray-600 rounded-full hover:bg-gray-700 active:bg-gray-800 transition-all duration-200 hover:scale-110"
                  title="Copy link to clipboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
