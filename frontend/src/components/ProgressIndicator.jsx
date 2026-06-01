import React, { useEffect, useRef, useState } from "react";
import "./ProgressIndicator.css";

/* ── Analysis stages ─────────────────────────────────── */
const STAGES = [
  { id: "upload",   label: "Uploading file",           icon: "upload",   threshold: 0  },
  { id: "extract",  label: "Extracting audio features", icon: "waveform", threshold: 25 },
  { id: "neural",   label: "Running neural analysis",   icon: "brain",    threshold: 55 },
  { id: "score",    label: "Computing confidence score",icon: "chart",    threshold: 80 },
  { id: "done",     label: "Finalising report",         icon: "check",    threshold: 96 },
];

/* ── SVG stage icons ─────────────────────────────────── */
const StageIcon = ({ type, active }) => {
  const stroke = active ? "url(#pi-grad)" : "currentColor";
  const w = 18, h = 18;
  const props = { width: w, height: h, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };

  const icons = {
    upload: (
      <svg {...props}>
        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
        <defs><linearGradient id="pi-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
      </svg>
    ),
    waveform: (
      <svg {...props}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        <defs><linearGradient id="pi-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
      </svg>
    ),
    brain: (
      <svg {...props}>
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.04-4.02A3 3 0 0 1 4.5 9.5a2.5 2.5 0 0 1 5-5z"/>
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.04-4.02A3 3 0 0 0 19.5 9.5a2.5 2.5 0 0 0-5-5z"/>
        <defs><linearGradient id="pi-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
      </svg>
    ),
    chart: (
      <svg {...props}>
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <defs><linearGradient id="pi-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
      </svg>
    ),
    check: (
      <svg {...props}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
        <defs><linearGradient id="pi-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#db2777"/></linearGradient></defs>
      </svg>
    ),
  };
  return icons[type] || icons.upload;
};

/* ── Waveform bars ───────────────────────────────────── */
const BAR_COUNT = 36;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const center = BAR_COUNT / 2;
  const dist = Math.abs(i - center) / center;
  return {
    dur:  `${0.4 + Math.random() * 0.65}s`,
    del:  `${(Math.random() * 0.55).toFixed(3)}s`,
    maxH: `${Math.max(15, 90 - dist * dist * 65) * (0.4 + Math.random() * 0.6)}%`,
  };
});

/* ── Main component ──────────────────────────────────── */
const ProgressIndicator = ({ progress, status }) => {
  const pct       = Math.round(Math.min(progress || 0, 100));
  const isDone    = pct >= 100;
  const [prevPct, setPrevPct] = useState(pct);
  const [flash,   setFlash]   = useState(false);
  const prevRef   = useRef(pct);

  /* flash pulse on each stage transition */
  useEffect(() => {
    const crossed = STAGES.some(
      s => prevRef.current < s.threshold && pct >= s.threshold
    );
    if (crossed) { setFlash(true); setTimeout(() => setFlash(false), 600); }
    prevRef.current = pct;
  }, [pct]);

  /* current & upcoming stages */
  const currentStageIdx = STAGES.reduce((best, s, i) =>
    pct >= s.threshold ? i : best, 0);

  /* SVG ring */
  const RADIUS = 52;
  const CIRC   = 2 * Math.PI * RADIUS;
  const offset = CIRC - (pct / 100) * CIRC;

  return (
    <div className={`pi-root${isDone ? " pi-root--done" : ""}${flash ? " pi-root--flash" : ""}`}>

      {/* ── Ambient glow ── */}
      <div className="pi-glow" />

      {/* ── Ring + waveform ── */}
      <div className="pi-visual">

        {/* SVG ring */}
        <svg className="pi-ring" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="pi-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#7c3aed"/>
              <stop offset="100%" stopColor="#db2777"/>
            </linearGradient>
            <filter id="pi-glow-f">
              <feGaussianBlur stdDeviation="2.5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Track */}
          <circle
            className="pi-ring-track"
            cx="60" cy="60" r={RADIUS}
            fill="none" strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            className="pi-ring-fill"
            cx="60" cy="60" r={RADIUS}
            fill="none" strokeWidth="6"
            stroke="url(#pi-ring-grad)"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.55s cubic-bezier(0.4,0,0.2,1)" }}
            filter="url(#pi-glow-f)"
          />
          {/* Dot at progress tip */}
          {pct > 2 && pct < 100 && (
            <circle
              className="pi-ring-dot"
              cx={60 + RADIUS * Math.cos((Math.PI * 2 * pct) / 100 - Math.PI / 2)}
              cy={60 + RADIUS * Math.sin((Math.PI * 2 * pct) / 100 - Math.PI / 2)}
              r="4.5"
            />
          )}
        </svg>

        {/* Center readout */}
        <div className="pi-center">
          {isDone ? (
            <div className="pi-center-done">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="url(#pi-ring-grad2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="pi-ring-grad2" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7c3aed"/>
                    <stop offset="100%" stopColor="#db2777"/>
                  </linearGradient>
                </defs>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          ) : (
            <>
              <span className="pi-pct">{pct}</span>
              <span className="pi-pct-sym">%</span>
            </>
          )}
        </div>
      </div>

      {/* ── Waveform ── */}
      <div className="pi-waveform">
        {BARS.map((b, i) => (
          <div
            key={i}
            className={`pi-bar${isDone ? " pi-bar--flat" : ""}`}
            style={{ "--dur": b.dur, "--del": b.del, "--maxH": b.maxH }}
          />
        ))}
      </div>

      {/* ── Status line ── */}
      <div className="pi-status">
        <span className="pi-status-dot" />
        <span className="pi-status-text" key={status}>{status}</span>
      </div>

      {/* ── Stage steps ── */}
      <div className="pi-stages">
        {STAGES.map((s, i) => {
          const done    = pct >= (STAGES[i + 1]?.threshold ?? 101);
          const active  = i === currentStageIdx;
          return (
            <div
              key={s.id}
              className={`pi-stage${done ? " pi-stage--done" : ""}${active ? " pi-stage--active" : ""}`}
            >
              <div className="pi-stage-icon">
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <StageIcon type={s.icon} active={active} />
                )}
              </div>
              <span className="pi-stage-label">{s.label}</span>
              {active && <span className="pi-stage-spinner" />}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default ProgressIndicator;
