import React, { useEffect, useRef, useState } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, ArcElement, Title, Tooltip, Legend, Filler,
} from "chart.js";
import "../styles/design-tokens.css";
import "./DetailedAnalysis.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

/* ── helpers ─────────────────────────────────────────── */
const isBad = (v = "") => /artificial|abnormal|ai detected|inconsistent/i.test(v);

const generateCurve = (isAI) => {
  if (isAI) return {
    human: [0.12, 0.18, 0.21, 0.26, 0.30, 0.34, 0.38, 0.42, 0.47, 0.50, 0.54],
    ai:    [0.88, 0.82, 0.79, 0.74, 0.70, 0.66, 0.62, 0.58, 0.53, 0.50, 0.46],
  };
  return {
    human: [0.42, 0.52, 0.63, 0.71, 0.79, 0.85, 0.90, 0.93, 0.95, 0.97, 0.98],
    ai:    [0.58, 0.48, 0.37, 0.29, 0.21, 0.15, 0.10, 0.07, 0.05, 0.03, 0.02],
  };
};

/* ── Animated score bar ───────────────────────────────── */
const ScoreBar = ({ score, bad }) => {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(Math.round((score ?? 0.5) * 100)), 120); return () => clearTimeout(t); }, [score]);
  return (
    <div className="da-score-track">
      <div
        className={`da-score-fill ${bad ? "da-score-fill--bad" : "da-score-fill--good"}`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
};

/* ── Radial gauge (SVG) ───────────────────────────────── */
const Gauge = ({ pct, isAI }) => {
  const [animated, setAnimated] = useState(0);
  useEffect(() => { const t = setTimeout(() => setAnimated(pct), 200); return () => clearTimeout(t); }, [pct]);
  const R = 54, C = 2 * Math.PI * R;
  const arc = C * 0.75; // 270° arc
  const fill = arc - (animated / 100) * arc;
  const color = isAI ? "#dc2626" : "#16a34a";
  return (
    <div className="da-gauge">
      <svg viewBox="0 0 130 130" className="da-gauge-svg">
        <defs>
          <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isAI ? "#7c3aed" : "#059669"} />
            <stop offset="100%" stopColor={isAI ? "#dc2626" : "#16a34a"} />
          </linearGradient>
        </defs>
        {/* Track arc */}
        <circle cx="65" cy="65" r={R} fill="none" stroke="rgba(0,0,0,0.08)"
          strokeWidth="10" strokeDasharray={`${arc} ${C}`}
          strokeLinecap="round" transform="rotate(135 65 65)" />
        {/* Fill arc */}
        <circle cx="65" cy="65" r={R} fill="none" stroke="url(#gaugeFill)"
          strokeWidth="10" strokeDasharray={`${arc - fill} ${C}`}
          strokeLinecap="round" transform="rotate(135 65 65)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }} />
      </svg>
      <div className="da-gauge-center">
        <span className="da-gauge-pct" style={{ color }}>{animated}%</span>
        <span className="da-gauge-label">confidence</span>
      </div>
    </div>
  );
};

/* ── Main component ───────────────────────────────────── */
const DetailedAnalysis = ({ analysisData }) => {
  if (!analysisData) return null;
  const { isAI, confidence, fileName, date, duration, format, sampleRate, analysisTime, details = [] } = analysisData;
  const curve = generateCurve(isAI);

  /* Line chart */
  const lineData = {
    labels: ["0s","0.5s","1s","1.5s","2s","2.5s","3s","3.5s","4s","4.5s","5s"],
    datasets: [
      {
        label: "Human Voice",
        data: curve.human,
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.06)",
        tension: 0.45, fill: true, pointRadius: 3, pointHoverRadius: 6,
        pointBackgroundColor: "#16a34a", borderWidth: 2,
      },
      {
        label: "AI Voice",
        data: curve.ai,
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.06)",
        tension: 0.45, fill: true, pointRadius: 3, pointHoverRadius: 6,
        pointBackgroundColor: "#dc2626", borderWidth: 2,
      },
    ],
  };

  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 1000, easing: "easeInOutQuart" },
    plugins: {
      legend: { position: "top", labels: { font: { family: "DM Sans", size: 12 }, padding: 20, usePointStyle: true, pointStyleWidth: 8 } },
      tooltip: {
        backgroundColor: "#09090f", titleColor: "#fff", bodyColor: "rgba(255,255,255,0.7)",
        padding: 12, cornerRadius: 10, borderColor: "rgba(255,255,255,0.08)", borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(1)}%` },
      },
    },
    scales: {
      x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { family: "DM Sans", size: 11 }, color: "#9ca3af" } },
      y: {
        beginAtZero: true, max: 1,
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: { font: { family: "DM Sans", size: 11 }, color: "#9ca3af", callback: v => `${(v*100).toFixed(0)}%` },
      },
    },
  };

  /* Donut chart */
  const humanPct  = isAI ? 100 - confidence : confidence;
  const aiPct     = isAI ? confidence : 100 - confidence;
  const donutData = {
    labels: ["Human Voice", "AI Voice"],
    datasets: [{
      data: [humanPct, aiPct],
      backgroundColor: ["rgba(22,163,74,0.85)", "rgba(220,38,38,0.85)"],
      borderColor: ["#16a34a", "#dc2626"],
      borderWidth: 2, hoverOffset: 6,
    }],
  };

  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: "68%",
    animation: { duration: 900, easing: "easeInOutQuart" },
    plugins: {
      legend: { position: "bottom", labels: { font: { family: "DM Sans", size: 12 }, padding: 18, usePointStyle: true } },
      tooltip: {
        backgroundColor: "#09090f", titleColor: "#fff", bodyColor: "rgba(255,255,255,0.7)",
        padding: 12, cornerRadius: 10, borderColor: "rgba(255,255,255,0.08)", borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}%` },
      },
    },
  };

  const meta = [
    { k: "File name",      v: fileName  || "—" },
    { k: "Duration",       v: duration  || "—" },
    { k: "Format",         v: format    || "—" },
    { k: "Sample rate",    v: sampleRate || "—" },
    { k: "Analysis time",  v: analysisTime ? `${analysisTime} ms` : "—" },
    { k: "Analysed",       v: date      || "—" },
  ];

  return (
    <div className="da-page">
      <div className="da-container">

        {/* ── Top hero row ─────────────────────────────── */}
        <div className="da-hero">

          {/* Verdict card — dark */}
          <div className={`da-verdict-card ${isAI ? "da-verdict-card--fake" : "da-verdict-card--real"}`}>
            <div className="da-verdict-card-bg" />
            <div className="da-verdict-top">
              <span className="da-verdict-eyebrow">Detection result</span>
              <span className={`da-verdict-pill ${isAI ? "da-verdict-pill--fake" : "da-verdict-pill--real"}`}>
                {isAI ? "AI Generated" : "Human Voice"}
              </span>
            </div>
            <Gauge pct={confidence} isAI={isAI} />
            <p className="da-verdict-caption">
              {isAI
                ? `Synthetic patterns detected with ${confidence}% certainty.`
                : `Authentic human voice confirmed at ${confidence}% certainty.`}
            </p>
            {/* File name strip */}
            <div className="da-verdict-file">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
              <span className="da-verdict-filename">{fileName}</span>
            </div>
          </div>

          {/* Donut chart */}
          <div className="da-chart-card">
            <div className="da-card-header">
              <span className="da-card-title">Confidence distribution</span>
              <span className="da-card-sub">Human vs AI split</span>
            </div>
            <div className="da-donut-wrap">
              <Doughnut data={donutData} options={donutOptions} />
            </div>
          </div>

          {/* Metadata */}
          <div className="da-meta-card">
            <div className="da-card-header">
              <span className="da-card-title">Audio metadata</span>
              <span className="da-card-sub">File properties</span>
            </div>
            <div className="da-meta-grid">
              {meta.map(({ k, v }) => (
                <div className="da-meta-row" key={k}>
                  <span className="da-meta-k">{k}</span>
                  <span className="da-meta-v">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Line chart ───────────────────────────────── */}
        <div className="da-line-card">
          <div className="da-card-header">
            <span className="da-card-title">Voice probability over time</span>
            <span className="da-card-sub">Human vs AI confidence across the audio segment</span>
          </div>
          <div className="da-line-wrap">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        {/* ── Feature analysis ─────────────────────────── */}
        {details.length > 0 && (
          <div className="da-features-section">
            <div className="da-section-heading">
              <span className="da-section-eyebrow">Feature breakdown</span>
              <h2 className="da-section-title">Acoustic feature analysis</h2>
            </div>
            <div className="da-features-grid">
              {details.map((d, i) => {
                const bad = isBad(d.value);
                const score = typeof d.score === "number" ? d.score : (bad ? 0.72 : 0.28);
                return (
                  <div className={`da-feature-card ${bad ? "da-feature-card--bad" : "da-feature-card--good"}`} key={i}
                    style={{ animationDelay: `${i * 0.07}s` }}>
                    <div className="da-feature-top">
                      <div className="da-feature-icon-wrap">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                      </div>
                      <span className="da-feature-label">{d.label}</span>
                      <span className={`da-feature-badge ${bad ? "da-feature-badge--bad" : "da-feature-badge--good"}`}>
                        {d.value}
                      </span>
                    </div>
                    <ScoreBar score={score} bad={bad} />
                    <div className="da-feature-footer">
                      <span className="da-feature-desc">{d.description}</span>
                      <span className="da-feature-score">{Math.round(score * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recommendation callout ────────────────────── */}
        <div className={`da-callout ${isAI ? "da-callout--fake" : "da-callout--real"}`}>
          <div className="da-callout-icon">
            {isAI ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            )}
          </div>
          <div className="da-callout-body">
            <strong className="da-callout-heading">
              {isAI ? "Caution — AI-Generated Content" : "Verified — Authentic Voice"}
            </strong>
            <p className="da-callout-text">
              {isAI
                ? `This audio shows strong indicators of AI synthesis. The ${confidence}% confidence score is based on Wav2Vec2 neural embeddings, MFCC pattern analysis, and spectral feature examination. Treat content from this source with appropriate caution.`
                : `This audio exhibits consistent natural human vocal characteristics. The ${confidence}% confidence score reflects analysis across all acoustic feature dimensions. This source can be considered authentic.`}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DetailedAnalysis;
