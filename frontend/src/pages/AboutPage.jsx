import React from "react";
import voiceRecognitionImage from "../assets/voice-recognition.svg";

const AboutUs = () => {
  return (
    <div className="max-w-7xl mx-auto p-8 font-['Poppins']">
      <h1 className="text-center text-5xl mb-12 text-gray-900">About Us</h1>
      <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
        <div className="flex-1 relative max-w-[450px] aspect-square bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl flex flex-col items-center justify-center p-8">
          <img
            src={voiceRecognitionImage}
            alt="Voice Recognition"
            className="w-30 h-30 mb-4 brightness-0 invert"
          />
          <div className="text-white text-2xl tracking-wider uppercase">
            VOICE RECOGNITION
          </div>
        </div>
        <div className="flex-1 bg-pink-100 p-8 rounded-2xl">
          <p className="text-lg leading-relaxed text-gray-700 m-0">
            VocalGuard is an advanced AI-driven web application designed to
            detect deepfake audio with precision and efficiency. By leveraging
            state-of-the-art machine learning algorithms, our platform ensures
            the authenticity of digital audio content, protecting users from
            misinformation and fraud. Committed to innovation and security,
            VocalGuard provides a reliable solution for safeguarding digital
            communications.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
