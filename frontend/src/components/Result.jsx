import React, { useRef, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import domtoimage from "dom-to-image";
import { FacebookShareButton, TwitterShareButton, WhatsappShareButton, FacebookIcon, TwitterIcon, WhatsappIcon } from "react-share";
import "../styles/design-tokens.css";
import "./Result.css";

const dummyResult = {
  fileName: "sample_audio.mp3", duration: "2:45", fileSize: "3.2 MB", format: "MP3",
  is_fake: false, confidence: 0.95, probability: 0.05,
  timestamp: new Date().toISOString(), metadata_id: "demo-id-1234",
  analysis_id: "demo-analysis-5678", details_id: "demo-details-9012",
  sampleRate: "44.1 kHz", analysisTime: "2450", modelUsed: "Standard",
  details: [
    { label: "Voice Pattern Analysis", value: "Natural", description: "Patterns match typical human speech characteristics" },
    { label: "Frequency Analysis", value: "Normal", description: "Frequency distribution within expected human range" },
    { label: "Background Noise", value: "Low", description: "Minimal background noise detected" },
    { label: "Speech Clarity", value: "High", description: "Clear and distinct speech patterns" },
  ],
};

const normalizeConfidence = (c) => {
  if (c === undefined || c === null) return 0;
  return typeof c === "number" && c <= 1 ? Math.round(c * 100) : Math.round(c);
};

/* ── Animated circular gauge ── */
const GaugeRing = ({ value, isFake }) => {
  const [displayed, setDisplayed] = useState(0);
  const SIZE = 180;
  const STROKE = 10;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (displayed / 100) * CIRC;

  useEffect(() => {
    let start = null;
    const duration = 1400;
    const target = value;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const gradId = isFake ? "gaugeGradFake" : "gaugeGradReal";

  return (
    <div className="gauge-wrap">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="gauge-svg">
        <defs>
          {isFake ? (
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
          ) : (
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>
          )}
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={STROKE}
        />

        {/* Fill arc */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          filter="url(#gaugeGlow)"
          style={{ transition: "stroke-dashoffset 0.05s linear" }}
        />
      </svg>

      {/* Centre label */}
      <div className="gauge-center">
        <span className={`gauge-number ${isFake ? "gauge-number--fake" : "gauge-number--real"}`}>
          {displayed}
        </span>
        <span className="gauge-pct">%</span>
        <span className="gauge-sub">confidence</span>
      </div>
    </div>
  );
};

/* ── Static waveform bars ── */
const WaveformBars = ({ isFake }) => {
  const heights = [
    18, 28, 14, 36, 22, 44, 30, 52, 38, 46, 28, 54, 40, 32, 48,
    24, 42, 34, 50, 26, 44, 36, 20, 38, 28, 46, 32, 54, 22, 40,
    30, 48, 18, 36, 26, 44, 34, 52, 24, 42,
  ];
  return (
    <div className="waveform-wrap">
      <div className="waveform-bars">
        {heights.map((h, i) => (
          <div
            key={i}
            className={`waveform-bar ${isFake ? "waveform-bar--fake" : "waveform-bar--real"}`}
            style={{
              height: `${h}px`,
              animationDelay: `${(i * 0.04).toFixed(2)}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

const Result = ({ result: propResult }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const result = propResult || location.state?.result || dummyResult;
  const pdfRef = useRef();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (!result) { navigate("/upload"); return null; }

  const isFake = result.is_fake;
  const confidence = normalizeConfidence(result.confidence);
  const shareUrl = window.location.href;
  const shareTitle = `VocalGuard Analysis: ${isFake ? "AI Generated" : "Human Voice"}`;
  const formatDate = (d) => new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const generatePDF = async () => {
    try {
      setIsGeneratingPDF(true);
      if (!pdfRef.current) throw new Error("Ref missing");
      const el = pdfRef.current;
      const tmp = document.createElement("div");
      tmp.style.cssText = "width:800px;padding:20px;background:#fff;";
      const clone = el.cloneNode(true);
      clone.querySelectorAll(".result-share-section, .result-actions").forEach(n => n.remove());
      tmp.appendChild(clone);
      document.body.appendChild(tmp);
      const dataUrl = await domtoimage.toPng(tmp, { quality: 1, bgcolor: "#fff" });
      document.body.removeChild(tmp);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgW = 190;
      const imgH = (tmp.offsetHeight * imgW) / 800;
      pdf.addImage(dataUrl, "PNG", 10, 10, imgW, imgH);
      pdf.setProperties({ title: "VocalGuard Analysis Report", author: "VocalGuard System" });
      pdf.save(`vocalguard-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      alert("Could not generate PDF. Please try again.");
    } finally { setIsGeneratingPDF(false); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="result-page vg-page">
      <div className="result-container">

        {/* ── Verdict hero ── */}
        <div
          ref={pdfRef}
          className={`result-verdict-hero ${isFake ? "result-verdict-hero--fake" : "result-verdict-hero--real"} ${heroVisible ? "result-verdict-hero--visible" : ""}`}
        >
          <div className="result-verdict-hero-bg" />

          {/* Left: label + waveform */}
          <div className="result-hero-left">
            <div className={`result-verdict-icon ${isFake ? "result-verdict-icon--fake" : "result-verdict-icon--real"}`}>
              {isFake ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              )}
            </div>

            <div className="result-hero-title-block">
              <p className="result-hero-eyebrow">Analysis Result</p>
              <h1 className="result-verdict-label">{isFake ? "AI Generated" : "Human Voice"}</h1>
              <p className="result-verdict-sub">
                {isFake
                  ? "Deepfake patterns detected in this audio sample."
                  : "No synthetic patterns detected — voice appears authentic."}
              </p>
            </div>

            {heroVisible && <WaveformBars isFake={isFake} />}
          </div>

          {/* Right: gauge */}
          <div className="result-hero-right">
            {heroVisible && <GaugeRing value={confidence} isFake={isFake} />}
          </div>
        </div>

        {/* ── Details grid ── */}
        <div className="result-grid">

          {/* Audio details */}
          <div className="result-section vg-card">
            <h2 className="result-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              Audio details
            </h2>
            <div className="result-kv-grid">
              {[
                ["File name", result.fileName],
                ["Duration",  result.duration],
                ["File size", result.fileSize],
                ["Format",    result.format],
              ].map(([k, v]) => (
                <div className="result-kv" key={k}>
                  <span className="result-kv-k">{k}</span>
                  <span className="result-kv-v">{v || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical analysis */}
          <div className="result-section vg-card">
            <h2 className="result-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Technical analysis
            </h2>
            <div className="result-kv-grid">
              {[
                ["Sample rate",   result.sampleRate],
                ["Bit depth",     result.bitDepth],
                ["Channels",      result.channels],
                ["Analysis time", result.analysisTime ? `${result.analysisTime} ms` : "—"],
                ["Model",         result.model_used || result.modelUsed || "Standard"],
                ["Timestamp",     result.timestamp ? formatDate(result.timestamp) : "—"],
              ].map(([k, v]) => (
                <div className="result-kv" key={k}>
                  <span className="result-kv-k">{k}</span>
                  <span className="result-kv-v">{v || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature scores */}
          {(result.details?.length > 0 || result.probabilities) && (
            <div className="result-section vg-card result-section--full">
              <h2 className="result-section-title">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                Feature analysis
              </h2>
              <div className="result-features-grid">
                {(Array.isArray(result.details) ? result.details : []).map((d, i) => (
                  <div className="result-feature-card" key={i}>
                    <div className="result-feature-header">
                      <span className="result-feature-label">{d.label}</span>
                      <span className={`result-feature-value ${
                        ["Artificial","Abnormal","AI Detected","Inconsistent"].includes(d.value)
                          ? "result-feature-value--bad"
                          : "result-feature-value--good"
                      }`}>{d.value}</span>
                    </div>
                    {d.description && <p className="result-feature-desc">{d.description}</p>}
                  </div>
                ))}
                {result.probabilities && Object.entries(result.probabilities).map(([key, val], i) => (
                  <div className="result-feature-card result-feature-card--prob" key={`p${i}`}>
                    <div className="result-feature-header">
                      <span className="result-feature-label">{key === "fake" ? "AI Voice Probability" : "Human Voice Probability"}</span>
                      <span className={`result-feature-value ${key === "fake" ? "result-feature-value--bad" : "result-feature-value--good"}`}>
                        {(val * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="result-prob-bar-track">
                      <div
                        className={`result-prob-bar-fill ${key === "fake" ? "result-prob-bar-fill--fake" : "result-prob-bar-fill--real"}`}
                        style={{ width: `${val * 100}%` }}
                      />
                    </div>
                    <p className="result-feature-desc">
                      {key === "fake" ? "Likelihood this audio was AI-generated" : "Likelihood this is an authentic human voice"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Analysis ref */}
          {result.analysis_id && (
            <div className="result-ref vg-card result-section--full">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              Analysis reference: <code className="result-ref-code">{result.analysis_id.substring(0, 8)}…</code>
              <span className="result-ref-hint">Available in your history.</span>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="result-actions">
          {result.analysis_id && (
            <button onClick={() => navigate(`/analysis/${result.analysis_id}`)} className="vg-btn vg-btn-secondary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
              Detailed analysis
            </button>
          )}
          <button onClick={generatePDF} disabled={isGeneratingPDF} className="vg-btn vg-btn-secondary">
            {isGeneratingPDF ? <><span className="vg-spinner vg-spinner-dark" />Generating…</> : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>Download PDF</>
            )}
          </button>
          <button onClick={() => navigate("/upload")} className="vg-btn vg-btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload another
          </button>
          <button onClick={() => navigate("/")} className="vg-btn vg-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Back to home
          </button>
        </div>

        {/* ── Share ── */}
        <div className="result-share-section vg-card">
          <h3 className="result-section-title" style={{ marginBottom: 16 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share results
          </h3>
          <div className="result-share-btns">
            <FacebookShareButton url={shareUrl} quote={shareTitle}><FacebookIcon size={36} round /></FacebookShareButton>
            <TwitterShareButton url={shareUrl} title={shareTitle}><TwitterIcon size={36} round /></TwitterShareButton>
            <WhatsappShareButton url={shareUrl} title={shareTitle}><WhatsappIcon size={36} round /></WhatsappShareButton>
            <button onClick={copyLink} className={`result-copy-btn ${copied ? "result-copy-btn--done" : ""}`} title="Copy link">
              {copied ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Result;
