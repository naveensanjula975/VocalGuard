import { useState,useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";


const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [checkedToken, setCheckedToken] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (!tokenFromUrl) {
      setCheckedToken(false);
      setStatus({
        type: "error",
        message: "Invalid or missing token in the URL.",
      });
    } else {
      setToken(tokenFromUrl);
      setCheckedToken(true);
    }
  }, []);
  return (
    <div>
      
    </div>
  );
}

export default ResetPassword;
