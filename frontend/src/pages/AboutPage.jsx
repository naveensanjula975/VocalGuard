import React from 'react';
import '../styles/AboutPage.css';
import voiceRecognitionImage from '../assets/voice-recognition.svg';

const AboutUs = () => {
  return (
    <div className="about-container">
      <h1 className="about-title">About Us</h1>
      <div className="about-content">
        <div className="image-container">
          <img src={voiceRecognitionImage} alt="Voice Recognition" className="voice-recognition-image" />
          <div className="voice-recognition-text">VOICE RECOGNITION</div>
        </div>
        <div className="text-container">
          <p>
            VocalGuard is an advanced AI-driven web application designed to detect deepfake audio with precision and efficiency. 
            By leveraging state-of-the-art machine learning algorithms, our platform ensures the authenticity of digital audio content, 
            protecting users from misinformation and fraud. Committed to innovation and security, VocalGuard provides a reliable solution 
            for safeguarding digital communications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;