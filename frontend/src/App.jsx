import React, { lazy, Suspense } from "react";
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

// ── Lazy‑loaded pages ────────────────────────
const HomePage = lazy(() => import("./pages/HomePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ResultPage = lazy(() => import("./pages/ResultPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const DetailedAnalysisPage = lazy(() => import("./pages/DetailedAnalysisPage"));
const UploadBox = lazy(() => import("./components/UploadBox"));

// ── Auth pages that hide the navbar ──────────
const AUTH_PATHS = ["/login", "/forgot-password", "/signup"];

// ── Route‑level loading spinner ──────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      <span className="text-sm text-gray-500">Loading…</span>
    </div>
  </div>
);

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = AUTH_PATHS.includes(location.pathname);

  return (
    <div className="flex flex-col w-full min-h-screen">
      {!isAuthPage && <Navbar />}
      <main className="flex-1 w-full min-h-[calc(100vh-64px)] bg-gray-50">
        <ErrorBoundary>
          <Suspense fallback={<PageSpinner />}>
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
          </Suspense>
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
