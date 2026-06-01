import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import "../styles/design-tokens.css";
import "./HistoryPage.css";

const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const formatAnalysisData = (analyses) => {
    if (!Array.isArray(analyses)) return [];
    return analyses.map((analysis) => {
      if (!analysis) return null;
      const metadata = analysis.metadata || {};
      const uploadDate = analysis.analysis_timestamp ? new Date(analysis.analysis_timestamp) : new Date();
      const formattedDate = uploadDate.toLocaleDateString("en-US", { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
      let confidence = parseFloat(analysis.confidence_score);
      if (isNaN(confidence) || confidence < 0) confidence = 0;
      if (confidence > 1) confidence = 1;
      const detailsArray = [];
      if (analysis.details?.feature_scores) {
        const f = analysis.details.feature_scores;
        if (f.mfcc_score !== undefined) detailsArray.push({ label:"Voice Pattern Analysis", value: f.mfcc_score > 0.5 ? "Artificial" : "Natural", description: f.mfcc_score > 0.5 ? "Patterns indicate potential AI generation" : "Patterns match typical human speech characteristics" });
        if (f.spectral_score !== undefined) detailsArray.push({ label:"Frequency Analysis", value: f.spectral_score > 0.5 ? "Abnormal" : "Normal", description: f.spectral_score > 0.5 ? "Unusual frequency distribution detected" : "Within expected human range" });
        if (f.temporal_score !== undefined) detailsArray.push({ label:"Temporal Analysis", value: f.temporal_score > 0.5 ? "Irregular" : "Regular", description: f.temporal_score > 0.5 ? "Temporal patterns suggest artificial generation" : "Natural temporal flow detected" });
      }
      if (detailsArray.length === 0) detailsArray.push({ label:"Overall Analysis", value: analysis.is_deepfake ? "Artificial" : "Natural", description: analysis.is_deepfake ? "AI patterns detected" : "Natural human voice characteristics" });
      const details = analysis.details || {};
      let processingTime = null;
      if (details.processing_time !== undefined) {
        processingTime = typeof details.processing_time === "string" ? parseInt(details.processing_time) : details.processing_time;
        if (isNaN(processingTime)) processingTime = null;
      }
      return {
        id: analysis.id, date: formattedDate,
        fileName: metadata.filename || "Unknown File",
        result: analysis.is_deepfake ? `${Math.round(confidence * 100)}% Fake` : `${Math.round((1 - confidence) * 100)}% Real`,
        isAI: analysis.is_deepfake,
        confidence: Math.round(confidence * 100),
        duration: metadata.duration ? `${parseFloat(metadata.duration).toFixed(2)}s` : "—",
        format: metadata.filename ? metadata.filename.split(".").pop().toUpperCase() : "—",
        sampleRate: metadata.sample_rate ? `${(parseFloat(metadata.sample_rate) / 1000).toFixed(1)} kHz` : "—",
        analysisTime: processingTime !== null ? `${processingTime.toFixed(0)} ms` : "—",
        details: detailsArray,
      };
    }).filter(Boolean);
  };

  useEffect(() => {
    const fetchAnalyses = async () => {
      try {
        if (!user?.token) { setError("You must be logged in to view history"); setLoading(false); return; }
        const response = await api.getUserAnalyses(user.token);
        setHistoryData(response.analyses && Array.isArray(response.analyses) ? formatAnalysisData(response.analyses) : []);
      } catch (err) {
        console.error(err); setError("Failed to load analysis history");
      } finally { setLoading(false); }
    };
    fetchAnalyses();
    setSelectedItems([]);
  }, [user]);

  const filteredHistory = historyData.filter(item => item.fileName?.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleItemSelect = (id) => setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const handleSelectAll = () => setSelectedItems(selectedItems.length === filteredHistory.length ? [] : filteredHistory.map(i => i.id));

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAnalyses(selectedItems, user.token);
      setHistoryData(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]); setShowDeleteModal(false);
    } catch { setError("Failed to delete selected items"); }
    finally { setIsDeleting(false); }
  };

  const handleViewDetails = (item) => {
    if (item.id) navigate(`/result/${item.id}`);
    else if (item.analysis_id) navigate(`/result/${item.analysis_id}`);
    else navigate("/detailed-analysis", { state: { analysisData: item } });
  };

  return (
    <div className="history-page vg-page">
      {/* Delete modal */}
      {showDeleteModal && (
        <div className="history-modal-overlay">
          <div className="history-modal vg-card">
            <div className="history-modal-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <h3 className="history-modal-title">Delete {selectedItems.length} item{selectedItems.length > 1 ? "s" : ""}?</h3>
            <p className="history-modal-body">This action cannot be undone.</p>
            <div className="history-modal-actions">
              <button onClick={confirmDelete} disabled={isDeleting} className="vg-btn vg-btn-danger">
                {isDeleting ? <><span className="vg-spinner" />Deleting…</> : "Delete"}
              </button>
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="vg-btn vg-btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="history-container">
        {/* Header */}
        <div className="history-header">
          <div>
            <div className="vg-section-eyebrow">Your account</div>
            <h1 className="history-title">Analysis History</h1>
          </div>
          <div className="history-toolbar">
            {selectedItems.length > 0 && (
              <button onClick={() => setShowDeleteModal(true)} disabled={isDeleting} className="vg-btn vg-btn-danger">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
                Delete {selectedItems.length}
              </button>
            )}
            <div className="history-search">
              <svg className="history-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="history-search-input"
                placeholder="Search files…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="history-state">
            <span className="vg-spinner vg-spinner-dark" style={{ width: 28, height: 28, borderWidth: 3 }} />
            <span>Loading history…</span>
          </div>
        ) : error ? (
          <div className="history-state history-state--error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            {!user && <button onClick={() => navigate("/login")} className="vg-btn vg-btn-primary">Sign in</button>}
          </div>
        ) : historyData.length === 0 ? (
          <div className="history-empty vg-card">
            <div className="history-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </div>
            <h3 className="history-empty-title">No analyses yet</h3>
            <p className="history-empty-sub">Upload an audio file to see results here.</p>
            <button onClick={() => navigate("/upload")} className="vg-btn vg-btn-primary" style={{ marginTop: 4 }}>
              Upload audio
            </button>
          </div>
        ) : (
          <div className="history-table-wrap vg-card">
            <table className="history-table">
              <thead>
                <tr>
                  <th className="history-th history-th--check">
                    <input type="checkbox"
                      className="history-checkbox"
                      checked={selectedItems.length === filteredHistory.length && filteredHistory.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="history-th">Date</th>
                  <th className="history-th">File</th>
                  <th className="history-th">Verdict</th>
                  <th className="history-th">Format</th>
                  <th className="history-th">Duration</th>
                  <th className="history-th history-th--right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className={`history-row${selectedItems.includes(item.id) ? " history-row--selected" : ""}`}
                  >
                    <td className="history-td history-td--check">
                      <input type="checkbox"
                        className="history-checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemSelect(item.id)}
                      />
                    </td>
                    <td className="history-td history-td--date">{item.date}</td>
                    <td className="history-td history-td--file">
                      <div className="history-file-cell">
                        <div className="history-file-icon">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                          </svg>
                        </div>
                        <span className="history-file-name">{item.fileName}</span>
                      </div>
                    </td>
                    <td className="history-td">
                      <span className={`vg-badge ${item.isAI ? "vg-badge-fake" : "vg-badge-real"}`}>
                        <span className="history-verdict-dot" style={{ background: item.isAI ? "var(--error)" : "var(--success)" }} />
                        {item.result}
                      </span>
                    </td>
                    <td className="history-td history-td--meta">{item.format}</td>
                    <td className="history-td history-td--meta">{item.duration}</td>
                    <td className="history-td history-td--action">
                      <button onClick={() => handleViewDetails(item)} className="history-view-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="history-table-footer">
              {filteredHistory.length} result{filteredHistory.length !== 1 ? "s" : ""}
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
