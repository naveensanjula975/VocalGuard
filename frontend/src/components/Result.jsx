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

// Dummy data for demonstration
const dummyResult = {
  fileName: "sample_audio.mp3",
  duration: "2:45",
  fileSize: "3.2 MB",
  format: "MP3",
  isAI: false,
  confidence: 95,
  timestamp: new Date().toISOString(),
  sampleRate: "44.1 kHz",
  bitDepth: "16 bits",
  channels: "2 (Stereo)",
  analysisTime: "2450",
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

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result || dummyResult;
  const pdfRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!result) {
    navigate("/upload");
    return null;
  }

  const shareUrl = window.location.href;
  const shareTitle = `VocalGuard Analysis Result: ${
    result.isAI ? "AI Generated" : "Human Voice"
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
            </div>

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
                        result.isAI ? "bg-red-500" : "bg-green-500"
                      }`}
                      style={{ width: `${result.confidence}%` }}></div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Confidence: {result.confidence}%
                  </p>
                </div>
                <div
                  className={`ml-4 px-4 py-2 rounded-full ${
                    result.isAI
                      ? "bg-red-100 text-red-800"
                      : "bg-green-100 text-green-800"
                  }`}>
                  {result.isAI ? "AI Generated" : "Human Voice"}
                </div>
              </div>
            </div>

            {/* Detailed Analysis Section */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Detailed Analysis
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {result.details.map((detail, index) => (
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
                ))}
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
                </div>
                <div>
                  <p className="text-sm text-gray-500">Channels</p>
                  <p className="font-medium">{result.channels}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Analysis Time</p>
                  <p className="font-medium">{result.analysisTime} ms</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className={`px-4 py-2 font-medium text-white rounded-lg ${
                  isGeneratingPDF
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}>
                {isGeneratingPDF ? "Generating PDF..." : "Download PDF"}
              </button>
              <button
                onClick={() => navigate("/upload")}
                className="px-4 py-2 font-medium text-gray-700 hover:text-gray-900">
                Upload Another
              </button>
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700">
                Back to Home
              </button>
            </div>

            {/* Share Section - This will be excluded from PDF */}
            <div className="pt-6 mt-8 border-t border-gray-200 react-share__ShareButton">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                Share Results
              </h3>
              <div className="flex gap-4">
                <FacebookShareButton url={shareUrl} quote={shareTitle}>
                  <FacebookIcon size={32} round />
                </FacebookShareButton>
                <TwitterShareButton url={shareUrl} title={shareTitle}>
                  <TwitterIcon size={32} round />
                </TwitterShareButton>
                <WhatsappShareButton url={shareUrl} title={shareTitle}>
                  <WhatsappIcon size={32} round />
                </WhatsappShareButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
