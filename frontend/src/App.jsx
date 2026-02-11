import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// ── Pages ────────────────────────────────────
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import AboutPage from "./pages/AboutPage";
import ResultPage from "./pages/ResultPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import DetailedAnalysisPage from "./pages/DetailedAnalysisPage";

// ── Components used as route targets ─────────
import UploadBox from "./components/UploadBox";

// ── Auth pages that hide the navbar ──────────
const AUTH_PATHS = ["/login", "/forgot-password", "/signup"];

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.includes(location.pathname);

  return (
    <div className="flex flex-col w-full min-h-screen">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 w-full min-h-[calc(100vh-64px)] bg-gray-50">
        <ErrorBoundary>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected */}
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

            {/* Results & analysis */}
            <Route path="/result" element={<ResultPage />} />
            <Route path="/result/:id" element={<ResultPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/detailed-analysis" element={<DetailedAnalysisPage />} />
            <Route path="/detailed-analysis/:id" element={<DetailedAnalysisPage />} />
            <Route path="/analysis/:id" element={<DetailedAnalysisPage />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
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
