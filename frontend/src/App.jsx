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
=======
import AboutUsPage from "./pages/AboutPage";
import Navbar from "./components/Navbar";
import "./styles/styles.css";
import "./App.css";

const AppContent = () => {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  return (
    <div className="app">
      {!isLoginPage && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <Router>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/result" element={<ResaultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
=======
      <AppContent />

    </Router>
  );
};

export default App;
