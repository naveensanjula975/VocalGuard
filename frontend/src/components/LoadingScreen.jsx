import React, { useEffect, useRef, useState } from "react";
import logo from "../assets/logo.jpg";
import "./LoadingScreen.css";

const STEPS = [
  "Starting up…",
  "Loading detection model…",
  "Preparing audio pipeline…",
  "Almost ready…",
  "Welcome.",
];

const LoadingScreen = ({ onComplete }) => {
  const [progress,  setProgress]  = useState(0);
  const [stepIdx,   setStepIdx]   = useState(0);
  const [phase,     setPhase]     = useState("enter"); // enter | hold | exit
  const exitedRef = useRef(false);

  useEffect(() => {
    const DURATION = 2800;
    const start    = performance.now();
    let raf;

    const tick = (now) => {
      const t      = Math.min((now - start) / DURATION, 1);
      // ease-in-out-cubic
      const eased  = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const pct    = Math.round(eased * 100);
      setProgress(pct);
      setStepIdx(Math.min(Math.floor(eased * STEPS.length), STEPS.length - 1));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        // brief hold at 100%, then exit
        setTimeout(() => {
          if (exitedRef.current) return;
          exitedRef.current = true;
          setPhase("exit");
          setTimeout(() => onComplete?.(), 650);
        }, 380);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  /* SVG ring maths */
  const R    = 58;
  const CIRC = 2 * Math.PI * R;
  const fill = CIRC - (progress / 100) * CIRC;

  return (
    <div className={`splash splash--${phase}`} role="status" aria-label="Loading VocalGuard">

      {/* Subtle noise texture overlay */}
      <div className="splash-noise" aria-hidden="true" />

      {/* Soft radial bloom */}
      <div className="splash-bloom" aria-hidden="true" />

      {/* ── Center card ── */}
      <div className="splash-card">

        {/* Ring + logo stack */}
        <div className="splash-ring-wrap">

          {/* SVG progress ring */}
          <svg className="splash-ring" viewBox="0 0 130 130" aria-hidden="true">
            <defs>
              <linearGradient id="splashGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%"   stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#db2777" />
              </linearGradient>
              <filter id="splashGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Track */}
            <circle cx="65" cy="65" r={R}
              fill="none" stroke="rgba(124,58,237,0.08)"
              strokeWidth="5" />

            {/* Progress arc */}
            <circle cx="65" cy="65" r={R}
              fill="none"
              stroke="url(#splashGrad)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={fill}
              transform="rotate(-90 65 65)"
              filter="url(#splashGlow)"
              style={{ transition: "stroke-dashoffset 0.45s cubic-bezier(0.4,0,0.2,1)" }}
            />

            {/* Trailing dot at tip */}
            {progress > 3 && progress < 100 && (() => {
              const angle = ((progress / 100) * 360 - 90) * (Math.PI / 180);
              const x = 65 + R * Math.cos(angle);
              const y = 65 + R * Math.sin(angle);
              return (
                <circle cx={x} cy={y} r="4"
                  fill="#db2777"
                  filter="url(#splashGlow)"
                  className="splash-tip-dot"
                />
              );
            })()}
          </svg>

          {/* Logo inside the ring */}
          <div className="splash-logo-wrap">
            <img src={logo} alt="VocalGuard" className="splash-logo" />
          </div>
        </div>

        {/* Brand name */}
        <div className="splash-brand">
          <span className="splash-brand-name">VocalGuard</span>
          <span className="splash-brand-tag">AI Audio Detection</span>
        </div>

        {/* Progress foot */}
        <div className="splash-foot">
          {/* Thin track */}
          <div className="splash-bar-track">
            <div
              className="splash-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step text + pct */}
          <div className="splash-foot-row">
            <span className="splash-step" key={stepIdx}>
              {STEPS[stepIdx]}
            </span>
            <span className="splash-pct">{progress}%</span>
          </div>
        </div>

      </div>

      {/* Bottom wordmark */}
      <div className="splash-byline" aria-hidden="true">Powered by Wav2Vec2-XLSR</div>

    </div>
  );
};

export default LoadingScreen;
