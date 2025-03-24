import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import HomePage from "./pages/HomePage";
import ResaultPage from "./pages/ResultPage";
import AboutUsPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import Navbar from "./components/NavBar";
import "./styles/styles.css";
import "./App.css";

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/forgot-password', '/signup'].includes(location.pathname);

  return (
    <div className="app">
      {!isAuthPage && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/result" element={<ResaultPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;