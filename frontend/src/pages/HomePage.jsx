import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./HomePage.css";

/* ── Waveform bar config ─────────────────────────────── */
const BARS = Array.from({ length: 42 }, (_, i) => {
  const center = 21;
  const dist = Math.abs(i - center) / center;
  const maxH = 90 - dist * dist * 65;
  return {
    dur: `${0.45 + Math.random() * 0.75}s`,
    del: `${Math.random() * 0.5}s`,
    h: `${8 + Math.random() * maxH}%`,
  };
});

/* ── SVG Icons ───────────────────────────────────────── */
const IconShield = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconZap = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const IconActivity = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);
const IconLock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconLayers = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);
const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);
const IconUpload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

/* ── Detection Card (hero visual) ───────────────────── */
const DetectionCard = () => (
  <div className="hp-card" style={{ position: "relative", zIndex: 1 }}>
    {/* Header */}
    <div className="hp-card-header">
      <span className="hp-card-title">Detection Report</span>
      <span className="hp-card-badge">
        <span className="hp-card-badge-dot" />
        AI Generated
      </span>
    </div>

    {/* Waveform */}
    <div className="hp-waveform">
      {BARS.map((b, i) => (
        <div
          key={i}
          className="hp-wbar"
          style={{ "--dur": b.dur, "--del": b.del, height: b.h }}
        />
      ))}
    </div>

    {/* Verdict */}
    <div className="hp-verdict">
      <div>
        <div className="hp-verdict-label">Verdict</div>
        <div className="hp-verdict-value">Deepfake Detected</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="hp-verdict-label">Confidence</div>
        <div className="hp-confidence">87%</div>
      </div>
    </div>

    {/* Confidence bar */}
    <div className="hp-conf-track">
      <div className="hp-conf-fill" />
    </div>

    {/* Meta */}
    <div className="hp-meta">
      {[
        { k: "Model", v: "Wav2Vec2-XLSR" },
        { k: "Duration", v: "0:24 / 2.1 MB" },
        { k: "Features", v: "MFCC + Spectral" },
        { k: "Latency", v: "1.3s" },
      ].map((m) => (
        <div className="hp-meta-item" key={m.k}>
          <div className="hp-meta-k">{m.k}</div>
          <div className="hp-meta-v">{m.v}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Main Page ───────────────────────────────────────── */
const HomePage = () => {
  const { user } = useAuth();

  return (
    <div className="hp-root">

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ padding: "64px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "80px",
          alignItems: "center",
        }}
        className="hp-hero-grid"
        >
          {/* Left */}
          <div>
            <div className="anim-1">
              <span className="hp-eyebrow">
                <span className="hp-eyebrow-dot" />
                Wav2Vec2-XLSR Neural Detection
              </span>
            </div>

            <h1 className="hp-h1" style={{ margin: "20px 0 24px" }}>
              <span className="anim-2" style={{ display: "block" }}>
                Detect AI voices
              </span>
              <span className="anim-3" style={{ display: "block" }}>
                before they{" "}
                <span className="hp-h1-gradient">deceive.</span>
              </span>
            </h1>

            <p className="anim-4" style={{
              fontSize: 17,
              color: "var(--ink-2)",
              lineHeight: 1.7,
              marginBottom: 36,
              maxWidth: 460,
            }}>
              VocalGuard uses state-of-the-art neural networks to identify
              AI-generated audio in seconds — protecting journalists,
              enterprises, and individuals from voice deepfakes.
            </p>

            <div className="anim-5" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link
                to={user ? "/upload" : "/login"}
                className="hp-btn-primary"
              >
                <IconUpload />
                {user ? "Upload Voice" : "Analyse Audio Free"}
              </Link>
              <Link to="/about" className="hp-btn-secondary">
                How it works
                <IconArrow />
              </Link>
            </div>

            {/* Trust row */}
            <div className="anim-5" style={{
              display: "flex",
              gap: 32,
              marginTop: 44,
              paddingTop: 36,
              borderTop: "1px solid var(--border)",
            }}>
              {[
                { num: "97.4%", label: "Detection accuracy" },
                { num: "< 2s",  label: "Avg. analysis time" },
                { num: "50k+",  label: "Files analysed" },
              ].map((t) => (
                <div className="hp-trust-item" key={t.num}>
                  <span className="hp-trust-num">{t.num}</span>
                  <span className="hp-trust-label">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Detection card */}
          <div style={{ position: "relative" }}>
            {/* Ambient blobs */}
            <div style={{
              position: "absolute",
              top: "-40px", left: "-40px",
              width: 320, height: 320,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute",
              bottom: "-40px", right: "-40px",
              width: 280, height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(219,39,119,0.08) 0%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }} />
            <DetectionCard />
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ─────────────────────────────── */}
      <section style={{ padding: "0 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div className="hp-stats">
          {[
            { num: "97.4%",  label: "Classification accuracy on benchmark datasets" },
            { num: "768-dim", label: "Wav2Vec2-XLSR embedding dimensions" },
            { num: "< 2s",   label: "Inference time on standard hardware" },
            { num: "3-layer", label: "Firestore schema for full audit trail" },
          ].map((s) => (
            <div className="hp-stat" key={s.num}>
              <div className="hp-stat-num">{s.num}</div>
              <div className="hp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────── */}
      <section style={{ padding: "0 24px 88px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 48 }}>
          <div className="hp-section-label">Capabilities</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <h2 className="hp-section-title">
              Everything you need to verify<br />audio authenticity.
            </h2>
            <p className="hp-section-sub" style={{ maxWidth: 380, textAlign: "right" }}>
              Built on production-grade ML infrastructure with a clean API and a
              full audit log for every analysis.
            </p>
          </div>
        </div>

        <div className="hp-features">
          {[
            {
              icon: <IconActivity />,
              title: "Wav2Vec2-XLSR Model",
              desc: "Facebook's cross-lingual speech representation model fine-tuned for deepfake detection. Captures subtle artifacts invisible to human ears.",
            },
            {
              icon: <IconLayers />,
              title: "MFCC + Spectral Features",
              desc: "80-dimensional MFCC features combined with spectral centroid, rolloff, and ZCR for a complete acoustic fingerprint of every file.",
            },
            {
              icon: <IconZap />,
              title: "Adaptive Weighting",
              desc: "Dynamic feature weighting algorithm adjusts confidence scores based on audio complexity — more accuracy for edge cases.",
            },
            {
              icon: <IconShield />,
              title: "Full Audit Trail",
              desc: "Every analysis writes to three Firestore collections (metadata, results, details) so you always have a verifiable record.",
            },
            {
              icon: <IconLock />,
              title: "Firebase Auth & Security",
              desc: "Secure token-based authentication with per-user analysis history. Only you can access your uploaded files and results.",
            },
            {
              icon: <IconZap />,
              title: "LRU Embedding Cache",
              desc: "100-item in-memory cache delivers ~10× speedup on repeat analyses — no redundant model inference for the same audio.",
            },
          ].map((f) => (
            <div className="hp-feature" key={f.title}>
              <div className="hp-feature-icon" style={{ color: "var(--violet)" }}>
                {f.icon}
              </div>
              <div className="hp-feature-title">{f.title}</div>
              <div className="hp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────── */}
      <section style={{
        padding: "64px 24px 88px",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div className="hp-section-label">Process</div>
            <h2 className="hp-section-title">Three steps to a verdict.</h2>
          </div>

          <div className="hp-steps">
            {[
              {
                n: "01",
                title: "Upload your audio",
                desc: "Drag and drop any WAV, MP3, or FLAC file up to 50 MB. We resample to 16 kHz mono automatically.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                  </svg>
                ),
              },
              {
                n: "02",
                title: "Neural analysis runs",
                desc: "Wav2Vec2 extracts 768-dim embeddings, combined with MFCC and spectral features through adaptive weighting.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
              },
              {
                n: "03",
                title: "Get your verdict",
                desc: "Receive a confidence score, a real vs. fake label, and a detailed breakdown of the acoustic features detected.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                ),
              },
            ].map((s, i) => (
              <div className="hp-step-card" key={s.n}>
                {/* connector line between cards */}
                {i < 2 && <div className="hp-step-connector" aria-hidden="true" />}
                <div className="hp-step-card-inner">
                  <div className="hp-step-badge">
                    <div className="hp-step-icon">{s.icon}</div>
                    <span className="hp-step-n">{s.n}</span>
                  </div>
                  <h3 className="hp-step-title">{s.title}</h3>
                  <p className="hp-step-desc">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────── */}
      <section style={{ padding: "64px 24px 80px", maxWidth: 1200, margin: "0 auto" }}>
        <div className="hp-cta-banner">
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 className="hp-cta-title">
              Start verifying voices<br />in seconds.
            </h2>
            <p className="hp-cta-sub">
              No credit card required. Analyse your first file free.
            </p>
          </div>
          <Link
            to={user ? "/upload" : "/login"}
            className="hp-btn-white"
            style={{ position: "relative", zIndex: 1 }}
          >
            {user ? "Upload Audio" : "Create Free Account"}
            <IconArrow />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        maxWidth: 1200,
        margin: "0 auto",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <span style={{ fontSize: 13, color: "var(--ink-4)" }}>
          © 2026 VocalGuard. All rights reserved.
        </span>
        <span style={{ fontSize: 13, color: "var(--ink-4)" }}>
          Powered by Wav2Vec2-XLSR · FastAPI · Firebase
        </span>
      </footer>

    </div>
  );
};

export default HomePage;
