import React, { useRef, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import domtoimage from "dom-to-image";
import {
  FacebookShareButton,
  WhatsappShareButton,
  FacebookIcon,
  WhatsappIcon,
} from "react-share";

// ── Helpers ──────────────────────────────────
function formatConfidence(raw) {
  if (raw === undefined || raw === null) return "N/A";
  const n = typeof raw === "number" && raw <= 1 ? raw * 100 : raw;
  return `${Math.round(n)}%`;
}

// ── Small presentational pieces (memoized) ───
const InfoCell = React.memo(({ label, value }) => (
  <div>
    <p className="text-sm text-gray-500">{label}</p>
    <p className="font-medium">{value}</p>
  </div>
));
InfoCell.displayName = "InfoCell";

const ActionButton = React.memo(({ onClick, disabled, className, icon, children, title }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex items-center justify-center gap-2 px-4 py-2.5 font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
  >
    {icon}
    {children}
  </button>
));
ActionButton.displayName = "ActionButton";

// ── Clipboard toast (React state, not DOM manipulation) ──
const CopyLinkButton = React.memo(({ url }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [url]);

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="flex items-center justify-center w-10 h-10 text-white bg-gray-600 rounded-full hover:bg-gray-700 active:bg-gray-800 transition-all duration-200 hover:scale-110"
        title="Copy link to clipboard"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      </button>
      {copied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-800 rounded whitespace-nowrap">
          Copied!
        </span>
      )}
    </div>
  );
});
CopyLinkButton.displayName = "CopyLinkButton";

// ── Spinner for PDF button ───────────────────
const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── SVG icons ────────────────────────────────
const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const BookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

// ── Main component ───────────────────────────
const Result = ({ result: propResult }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = propResult || location.state?.result;
  const pdfRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // ── Redirect via useEffect instead of during render ──
  useEffect(() => {
    if (!result) {
      navigate("/upload");
    }
  }, [result, navigate]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = result
    ? `VocalGuard Analysis Result: ${result.is_fake ? "AI Generated" : "Human Voice"}`
    : "";
  const modelUsed = result?.model_used || result?.modelUsed || "Standard";
  const isAdvancedModel = modelUsed === "wav2vec2-xlsr-deepfake";

  // ── Memoized PDF generation ────────────────
  const generatePDF = useCallback(async () => {
    try {
      setIsGeneratingPDF(true);
      if (!pdfRef.current) throw new Error("PDF reference not found");

      const element = pdfRef.current;

      // Create a temp container for clean PDF capture
      const tempContainer = document.createElement("div");
      Object.assign(tempContainer.style, {
        width: "800px",
        padding: "20px",
        backgroundColor: "#ffffff",
      });

      const content = element.cloneNode(true);

      // Remove non-print sections
      content.querySelector(".react-share__ShareButton")?.remove();
      content.querySelector(".pdf-exclude-buttons")?.remove();

      tempContainer.appendChild(content);
      document.body.appendChild(tempContainer);

      const dataUrl = await domtoimage.toPng(tempContainer, {
        quality: 1.0,
        bgcolor: "#ffffff",
        width: 800,
        height: tempContainer.scrollHeight,
        style: {
          transform: "scale(1)",
          "transform-origin": "top left",
          width: "800px",
          height: "auto",
          fontFamily: "system-ui, -apple-system, sans-serif",
        },
      });

      document.body.removeChild(tempContainer);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", putOnlyUsedFonts: true, floatPrecision: 16 });
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (tempContainer.scrollHeight * imgWidth) / 800;
      const finalHeight = Math.min(imgHeight, pageHeight - 2 * margin);

      pdf.addImage(dataUrl, "PNG", margin, margin, imgWidth, finalHeight);
      pdf.setProperties({
        title: "VocalGuard Analysis Report",
        subject: "Voice Authentication Analysis",
        author: "VocalGuard System",
        keywords: "voice, authentication, analysis, report",
        creator: "VocalGuard",
      });

      pdf.save(`vocalguard-analysis-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please try again or contact support.");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, []);

  // ── Navigation handlers (memoized) ─────────
  const handleGoToAnalysis = useCallback(() => {
    if (result?.analysis_id) {
      navigate(`/analysis/${result.analysis_id}`);
    }
  }, [navigate, result?.analysis_id]);

  const handleGoToUpload = useCallback(() => {
    navigate("/upload");
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  // Early return after hooks
  if (!result) {
    return null;
  }

  // ── Render ─────────────────────────────
  return (
    <div className="min-h-screen px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div ref={pdfRef} className="p-6 bg-white rounded-lg shadow">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">VocalGuard Analysis Report</h1>
              <p className="text-sm text-gray-500">Voice Authentication System</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Analysis Date:</span>
              <span className="font-medium">{new Date(result.timestamp).toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-4">
            {/* Audio Details */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Audio Details</h2>
              <div className="grid grid-cols-2 gap-3">
                <InfoCell label="File Name" value={result.fileName} />
                <InfoCell label="Duration" value={result.duration} />
                <InfoCell label="File Size" value={result.fileSize} />
                <InfoCell label="Format" value={result.format} />
              </div>
            </div>

            {/* Analysis Result */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Analysis Result</h2>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-2 overflow-hidden bg-gray-200 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${result.is_fake ? "bg-red-500" : "bg-green-500"}`}
                      style={{ width: `${result.confidence ? result.confidence * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Confidence: {formatConfidence(result.confidence)}
                  </p>
                </div>
                <div className={`ml-4 px-4 py-2 rounded-full ${result.is_fake ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {result.is_fake ? "AI Generated" : "Human Voice"}
                </div>
              </div>

              {(result.metadata_id || result.analysis_id) && (
                <div className="mt-3 text-xs text-gray-400">
                  <p>
                    Analysis Reference: {result.analysis_id ? result.analysis_id.substring(0, 8) + "..." : "Not stored yet"}
                  </p>
                  <p className="text-xs text-gray-300">You can access this analysis later from your history page.</p>
                </div>
              )}
            </div>

            {/* Detailed Analysis */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Detailed Analysis</h2>
              <div className="grid grid-cols-2 gap-3">
                {(Array.isArray(result.details) ? result.details : []).map((detail, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{detail.label}</span>
                      <span className="text-gray-600">{detail.value}</span>
                    </div>
                    {detail.description && <p className="mt-1 text-sm text-gray-500">{detail.description}</p>}
                  </div>
                ))}

                {/* WAV2VEC2 probabilities */}
                {result.probabilities &&
                  Object.entries(result.probabilities).map(([key, value], index) => (
                    <div
                      key={`wav2vec2-${index}`}
                      className={`p-3 bg-white rounded-lg shadow-sm border-l-4 ${key === "fake" ? "border-red-500" : "border-green-500"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          {key === "fake" ? "AI Voice Probability" : "Human Voice Probability"}
                        </span>
                        <span className={`${key === "fake" ? "text-red-600" : "text-green-600"} font-semibold`}>
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full mt-2 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${key === "fake" ? "bg-red-500" : "bg-green-500"}`}
                          style={{ width: `${value * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {key === "fake"
                          ? "Likelihood this audio was generated by AI"
                          : "Likelihood this audio is from a human voice"}
                      </p>
                    </div>
                  ))}
              </div>
            </div>

            {/* Technical Analysis */}
            <div className="p-4 rounded-lg bg-gray-50">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">Technical Analysis</h2>
              <div className="grid grid-cols-2 gap-3">
                <InfoCell label="Sample Rate" value={result.sampleRate} />
                <InfoCell label="Bit Depth" value={result.bitDepth} />
                <InfoCell label="Channels" value={result.channels} />
                <InfoCell label="Analysis Time" value={`${result.analysisTime} ms`} />
                <div>
                  <p className="text-sm text-gray-500">Model Used</p>
                  <p className="font-medium">
                    {modelUsed}
                    {isAdvancedModel && (
                      <span className="inline-flex ml-1 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded">
                        Advanced AI
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons (excluded from PDF) */}
            <div className="flex flex-wrap justify-end gap-3 mt-6 pdf-exclude-buttons">
              {result.analysis_id && (
                <ActionButton
                  onClick={handleGoToAnalysis}
                  title="View advanced visualization and detailed feature analysis"
                  className="text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
                  icon={<BookIcon />}
                >
                  Detailed Analysis
                </ActionButton>
              )}

              <ActionButton
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                title="Download a PDF copy of this report"
                className={isGeneratingPDF ? "text-white bg-teal-400 cursor-not-allowed" : "text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800"}
                icon={isGeneratingPDF ? <SpinnerIcon /> : <DownloadIcon />}
              >
                {isGeneratingPDF ? "Generating..." : "Download PDF"}
              </ActionButton>

              <ActionButton
                onClick={handleGoToUpload}
                title="Upload a new audio file for analysis"
                className="text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100"
                icon={<UploadIcon />}
              >
                Upload Another
              </ActionButton>

              <ActionButton
                onClick={handleGoHome}
                title="Return to the homepage"
                className="text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800"
                icon={<HomeIcon />}
              >
                Back to Home
              </ActionButton>
            </div>

            {/* Share Section (excluded from PDF) */}
            <div className="pt-6 mt-8 border-t border-gray-200 react-share__ShareButton">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Share Results
              </h3>
              <div className="flex flex-wrap gap-4">
                <FacebookShareButton url={shareUrl} quote={shareTitle} className="transition-transform hover:scale-110">
                  <FacebookIcon size={40} round />
                </FacebookShareButton>
                <WhatsappShareButton url={shareUrl} title={shareTitle} className="transition-transform hover:scale-110">
                  <WhatsappIcon size={40} round />
                </WhatsappShareButton>
                <CopyLinkButton url={shareUrl} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Result;
