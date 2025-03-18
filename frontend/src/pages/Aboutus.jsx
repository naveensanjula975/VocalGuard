import React from "react";
import "../styles/Aboutus.css"; // Import CSS file
import voiceRecognition from "../assets/voice-recognition.jpg"; // Image from public folder

const App = () => {
  return (
    <div className="container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">VOCAL Guard</div>
        <div className="nav-links">
          <a href="#">Home</a>
          <a href="#">About us</a>
          <a href="#">History</a>
        </div>
      </nav>

      {/* About Us Section */}
      <section className="about">
        <h2>About Us</h2>

        <div className="content">
          {/* Image Card */}
          <div className="image-card">
            <img src={voiceRecognition} alt="Voice Recognition" />
          
          </div>

          {/* Text Content */}
          <div className="text-box">
            <p>
              <strong>VocalGuard</strong> is an advanced AI-driven web
              application designed to detect deepfake audio with precision and
              efficiency. By leveraging state-of-the-art machine learning
              algorithms, our platform ensures the authenticity of digital audio
              content, protecting users from misinformation and fraud.
            </p>
            <p>
              Committed to innovation and security, VocalGuard provides a
              reliable solution for safeguarding digital communications.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default App;