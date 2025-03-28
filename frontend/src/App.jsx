import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import ResaultPage from "./pages/ResultPage";
import AboutUsPage from "./pages/AboutPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import SignupPage from "./pages/SignupPage";
import HistoryPage from "./pages/HistoryPage";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/Navbar";
import UploadBox from "./components/UploadBox";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css";

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ["/login", "/forgot-password", "/signup"].includes(
    location.pathname
  );

  return (
    <div className="app">
      {!isAuthPage && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route
            path="/upload"
            element={
              <ProtectedRoute>
                <UploadBox />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <HistoryPage />
              </ProtectedRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/result" element={<ResaultPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
