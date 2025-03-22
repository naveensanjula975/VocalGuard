import React from "react";
import { Link } from "react-router-dom";
import "../styles/HomePage.css";

const HomePage = () => {
  return (
    <div className="home-container">
      <div className="home-content">
        <div className="left-section">
          <h1 className="main-title">
            Your trusted solution
            <br />
            for detecting AI
            <br />
            generated voices.
          </h1>
          <div className="plus-one">+1</div>

          <p className="subtitle">
            Ensure authenticity and security
            <br />
            with cutting-edge AI technology.
          </p>

          <Link to="/login" className="get-started-btn">
            Get Started
          </Link>

          <div className="features">
            <div className="feature">
              <h3>Advanced Detection</h3>
              <p>Identify AI-generated voices with high accuracy.</p>
            </div>
            <div className="feature">
              <h3>Real-Time Analysis</h3>
              <p>Get instant verification results.</p>
            </div>
          </div>

          <div className="copyright">
            © All rights reserved by <span className="brand">Vocal Guard</span>
          </div>
        </div>

        <div className="right-section">
          <div className="demo-interface">
            <div className="audio-card">
              <div className="play-button">
                <span className="play-icon">▶</span>
                <span className="time">0:15</span>
              </div>
              <div className="heart-icon">❤️</div>
            </div>

            <div className="audio-card">
              <div className="play-button">
                <span className="play-icon">▶</span>
                <div className="waveform"></div>
                <span className="time">0:15</span>
              </div>
              <div className="heart-icon">❤️</div>
            </div>

            <div className="users">
              <span className="user-tag">Max McKinney 🎧</span>
              <span className="user-tag">John Smith 🎧</span>
              <span className="user-tag">Rohit Chouhan 🎧</span>
            </div>

            <div className="recording-section">
              <div className="recording-indicator">
                <span className="mic-icon">🎤</span>
                Recording
              </div>
              <div className="voice-memo">
                <div className="memo-header">
                  <span>Voice memo</span>
                  <span className="close">×</span>
                </div>
                <div className="memo-waveform">
                  <div className="record-button">⬤</div>
                  <div className="waveform-visual"></div>
                  <span className="time">0:11/0:30</span>
                </div>
              </div>
            </div>

            <div className="thumbs-up">👍</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
