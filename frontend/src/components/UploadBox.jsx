import React, { useState } from 'react';
import '../styles/UploadBox.css';

const UploadBox = () => {
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Email:', email);
    console.log('File:', file);
  };

  return (
    <div className="upload-box">
      <h1 className="upload-title">Upload Audio</h1>
      <p className="upload-subtitle">Select mp3 or flac file format.</p>
      <form onSubmit={handleSubmit} className="upload-form">
        <label>Email</label>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label>File</label>
        <input
          type="file"
          accept=".mp3,.flac"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />
        <button type="submit">Upload Now</button>
      </form>
    </div>
  );
};

export default UploadBox;
