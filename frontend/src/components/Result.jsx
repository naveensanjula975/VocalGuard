import React from "react";
import "../styles/ResultStyle.css";

export default function Result() {
  return( 
    <div className="cont">
  <h1 className="head-text">Audio Analysis Results</h1>
<div className="topdiv">
  <p className="topic">Here are the results for the uploaded audio file...</p></div>


  <div className="detail">
    <div className="name1">
      <div className="name-head">File Name :</div>
      <div className="de">audio_clip_01.wav</div>
    </div>
    <div className="name2">
    <div className="dura-head">Duration :</div>
    <div className="de">3 minutes 12 seconds</div>
    </div>
    <div className="name3">
    <div className="date-head">Date :</div>
    <div className="de">Feb 7, 2025</div>
    </div>
    
  </div>
  
</div>
  );
}
