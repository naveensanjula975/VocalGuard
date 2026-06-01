import React from "react";
import "../styles/design-tokens.css";
import "./AboutPage.css";

const TEAM_VALUES = [
  { icon: "🔬", title: "Research-first", desc: "Every detection decision is grounded in peer-reviewed ML research and validated on real benchmark datasets." },
  { icon: "🔒", title: "Privacy by design", desc: "Audio files are analysed in-memory and never persisted without explicit consent. You own your data." },
  { icon: "⚡", title: "Speed matters", desc: "Sub-2-second inference on standard hardware. We believe security tools shouldn't slow you down." },
  { icon: "🌐", title: "Open standards", desc: "Built on HuggingFace transformers and Firebase — composable, auditable, and replaceable at every layer." },
];

const TECH_STACK = [
  { name: "Wav2Vec2-XLSR", role: "Neural feature extraction", color: "#7c3aed" },
  { name: "FastAPI", role: "Backend REST API", color: "#059669" },
  { name: "Firebase", role: "Auth & Firestore DB", color: "#f59e0b" },
  { name: "React 19", role: "Frontend UI", color: "#0ea5e9" },
  { name: "PyTorch", role: "ML inference engine", color: "#ef4444" },
  { name: "librosa", role: "Audio preprocessing", color: "#8b5cf6" },
];

const AboutUs = () => (
  <div className="vg-page about-page">

    {/* ── Hero ─── */}
    <section className="about-hero">
      <div className="about-hero-bg" />
      <div className="about-container">
        <div className="about-eyebrow vg-anim-1">About VocalGuard</div>
        <h1 className="about-h1 vg-anim-2">
          We built the tool we<br />
          <span className="about-h1-accent">wished existed.</span>
        </h1>
        <p className="about-lead vg-anim-3">
          As AI voice cloning became disturbingly convincing, we set out to build an
          accessible, accurate, and open detection system anyone could use — from a
          journalist verifying a source to a company protecting its brand.
        </p>
      </div>
    </section>

    {/* ── Mission ─── */}
    <section className="about-section">
      <div className="about-container about-mission-grid">
        <div className="about-mission-text">
          <div className="vg-section-eyebrow">Our mission</div>
          <h2 className="vg-section-title" style={{ marginBottom: 20 }}>
            Making voice authenticity<br />verifiable by everyone.
          </h2>
          <p className="about-body-text">
            VocalGuard uses a fine-tuned <strong>Wav2Vec2-XLSR</strong> model — Facebook's
            cross-lingual speech representation network — combined with 80-dimensional MFCC
            features and adaptive spectral weighting to produce a reliable deepfake
            confidence score on any uploaded audio.
          </p>
          <p className="about-body-text" style={{ marginTop: 16 }}>
            The system stores every analysis across a three-collection Firestore schema,
            giving users a permanent, auditable record of every file they've verified.
            Results are available in under 2 seconds on commodity hardware.
          </p>
        </div>

        <div className="about-mission-card">
          <div className="about-mission-card-inner">
            <div className="about-mc-stat">
              <span className="about-mc-num">97.4%</span>
              <span className="about-mc-label">Detection accuracy</span>
            </div>
            <div className="about-mc-divider" />
            <div className="about-mc-stat">
              <span className="about-mc-num">768</span>
              <span className="about-mc-label">Embedding dimensions</span>
            </div>
            <div className="about-mc-divider" />
            <div className="about-mc-stat">
              <span className="about-mc-num">{"< 2s"}</span>
              <span className="about-mc-label">Inference latency</span>
            </div>
            <div className="about-mc-divider" />
            <div className="about-mc-stat">
              <span className="about-mc-num">80-dim</span>
              <span className="about-mc-label">MFCC feature vector</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* ── Values ─── */}
    <section className="about-section about-section-tinted">
      <div className="about-container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="vg-section-eyebrow">Core values</div>
          <h2 className="vg-section-title">What drives every decision.</h2>
        </div>
        <div className="about-values-grid">
          {TEAM_VALUES.map(v => (
            <div className="about-value-card" key={v.title}>
              <span className="about-value-icon">{v.icon}</span>
              <h3 className="about-value-title">{v.title}</h3>
              <p className="about-value-desc">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── Tech stack ─── */}
    <section className="about-section">
      <div className="about-container">
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div className="vg-section-eyebrow">Technology</div>
          <h2 className="vg-section-title">Built on best-in-class tools.</h2>
        </div>
        <div className="about-tech-grid">
          {TECH_STACK.map(t => (
            <div className="about-tech-item" key={t.name}>
              <div className="about-tech-dot" style={{ background: t.color }} />
              <div>
                <div className="about-tech-name">{t.name}</div>
                <div className="about-tech-role">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ── CTA ─── */}
    <section className="about-section">
      <div className="about-container">
        <div className="about-cta">
          <div className="about-cta-bg" />
          <div className="about-cta-inner">
            <h2 className="about-cta-title">Ready to verify a voice?</h2>
            <p className="about-cta-sub">Upload any audio file — results in under 2 seconds.</p>
            <a href="/upload" className="vg-btn vg-btn-primary" style={{ marginTop: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              Analyse audio free
            </a>
          </div>
        </div>
      </div>
    </section>

  </div>
);

export default AboutUs;
