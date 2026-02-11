import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { buildFeatureDetails } from "../utils/formatAnalysis";

// ── Helpers ──────────────────────────────────
function safeDate(raw) {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatDateString(date) {
  return (
    date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) +
    ", " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
  );
}

function clampConfidence(raw) {
  const n = parseFloat(raw);
  if (isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

function parseProcessingTime(details) {
  const pt = details?.processing_time;
  if (pt === undefined) return null;
  const n = typeof pt === "string" ? parseInt(pt, 10) : pt;
  return isNaN(n) ? null : n;
}

/**
 * Transform a single API analysis object into the shape the table needs.
 */
function formatOneAnalysis(analysis) {
  if (!analysis) return null;

  const uploadDate = safeDate(analysis.analysis_timestamp);
  const confidence = clampConfidence(analysis.confidence_score);
  const pct = Math.round(confidence * 100);
  const classification = analysis.is_deepfake ? "Fake" : "Real";

  const details = buildFeatureDetails(
    analysis.details?.feature_scores,
    analysis.is_deepfake,
    confidence,
  );

  const pt = parseProcessingTime(analysis.details);

  return {
    id: analysis.id,
    date: formatDateString(uploadDate),
    fileName: analysis.filename || "Unknown File",
    result: `${classification} (${pct}%)`,
    resultClassification: classification,
    resultPercentage: pct,
    isAI: analysis.is_deepfake,
    confidence: pct,
    duration: analysis.duration ? `${parseFloat(analysis.duration).toFixed(2)}s` : "Unknown",
    format: analysis.filename ? analysis.filename.split(".").pop().toUpperCase() : "Unknown",
    sampleRate: analysis.sample_rate ? `${(parseFloat(analysis.sample_rate) / 1000).toFixed(1)} kHz` : "Unknown",
    analysisTime: pt !== null ? `${pt.toFixed(0)} ms` : "Unknown",
    details,
    rawData: analysis,
    timestamp: uploadDate,
  };
}

// ── Delete‑confirmation modal ────────────────
const DeleteModal = ({ count, isDeleting, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full text-center animate-fade-in">
      <svg className="mx-auto mb-4 w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <h2 id="delete-modal-title" className="text-xl font-semibold mb-2 text-gray-800">
        Delete {count} selected item{count > 1 ? "s" : ""}?
      </h2>
      <p className="text-gray-600 mb-6">
        This action cannot be undone. Are you sure you want to permanently delete the selected analysis{count > 1 ? "es" : ""}?
      </p>
      <div className="flex justify-center gap-4">
        <button onClick={onConfirm} disabled={isDeleting} className="px-5 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-60">
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
        <button onClick={onCancel} disabled={isDeleting} className="px-5 py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-colors">
          Cancel
        </button>
      </div>
    </div>
  </div>
);

// ── Spinner icon ─────────────────────────────
const Spinner = ({ className = "h-4 w-4" }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── Component ────────────────────────────────
const HistoryPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sortDirection, setSortDirection] = useState("desc");
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Fetch data ─────────────────────────
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user?.token) {
        setError("You must be logged in to view history");
        setLoading(false);
        return;
      }

      try {
        const response = await api.getUserAnalyses(user.token);
        const raw = response.analyses;

        if (Array.isArray(raw)) {
          const formatted = raw
            .map(formatOneAnalysis)
            .filter(Boolean)
            .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
          setHistoryData(formatted);
        } else {
          setHistoryData([]);
        }
      } catch (err) {
        console.error("Error fetching analyses:", err);
        setError("Failed to load analysis history");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyses();
    setSelectedItems([]);
  }, [user]);

  // ── Derived state ──────────────────────
  const filteredHistory = useMemo(
    () =>
      historyData.filter(
        (item) => item.fileName && item.fileName.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [historyData, searchTerm],
  );

  // ── Selection handlers ─────────────────
  const handleItemSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedItems((prev) =>
      prev.length === filteredHistory.length ? [] : filteredHistory.map((i) => i.id),
    );
  };

  // ── Delete flow ────────────────────────
  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAnalyses(selectedItems, user.token);
      setHistoryData((prev) => prev.filter((i) => !selectedItems.includes(i.id)));
      setSelectedItems([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Error deleting items:", err);
      setError("Failed to delete selected items");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Sort toggle ────────────────────────
  const toggleDateSort = () => {
    const dir = sortDirection === "desc" ? "asc" : "desc";
    setSortDirection(dir);
    setHistoryData((prev) => {
      const sorted = [...prev].sort((a, b) => {
        const tA = a.timestamp?.getTime() || 0;
        const tB = b.timestamp?.getTime() || 0;
        return dir === "desc" ? tB - tA : tA - tB;
      });
      return sorted;
    });
  };

  // ── Navigation ─────────────────────────
  const handleViewDetails = (item) => {
    const id = item.id || item.analysis_id;
    if (id) {
      navigate(`/result/${id}`);
    } else {
      navigate("/detailed-analysis", { state: { analysisData: item } });
    }
  };

  // ── Render ─────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {showDeleteModal && (
        <DeleteModal
          count={selectedItems.length}
          isDeleting={isDeleting}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Header / toolbar */}
      <div className="flex flex-wrap justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold mb-2 sm:mb-0">Analysis History</h1>
        <div className="flex flex-wrap items-center gap-4">
          {selectedItems.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center"
            >
              {isDeleting ? (
                <Spinner className="h-4 w-4 mr-2" />
              ) : (
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
              Delete {selectedItems.length} selected
            </button>
          )}

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 px-4 py-2 rounded-full bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Search analysis history"
            />
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2" aria-label="Search">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content area */}
      {loading ? (
        <div className="flex justify-center items-center h-64" role="status" aria-label="Loading history">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-700" />
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-center text-red-500" role="alert">
          <p>{error}</p>
          {!user && (
            <button onClick={() => navigate("/login")} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
              Login to View History
            </button>
          )}
        </div>
      ) : historyData.length === 0 ? (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-xl font-medium text-gray-600 mb-4">No Analysis History Found</h3>
          <p className="text-gray-500 mb-6">You haven't analyzed any audio files yet or no records were found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredHistory.length && filteredHistory.length > 0}
                      onChange={handleSelectAll}
                      className="rounded text-purple-600 focus:ring-purple-500"
                      aria-label="Select all rows"
                    />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={toggleDateSort}
                    aria-sort={sortDirection === "desc" ? "descending" : "ascending"}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <svg className={`w-4 h-4 transition-transform ${sortDirection === "desc" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filename</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Format</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredHistory.map((item, index) => (
                  <tr
                    key={item.id || index}
                    className={`hover:bg-purple-50 transition-colors ${selectedItems.includes(item.id) ? "bg-purple-50" : ""}`}
                  >
                    <td className="px-3 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleItemSelect(item.id)}
                        className="rounded text-purple-600 focus:ring-purple-500"
                        aria-label={`Select ${item.fileName}`}
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{item.date}</td>
                    <td className="px-4 py-4 text-sm text-blue-600 max-w-[15rem] truncate">
                      <div className="flex items-center">{item.fileName}</div>
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium ${item.isAI ? "text-red-500" : "text-green-500"}`}>
                      <div className="flex items-center">
                        <span className={`inline-block w-2 h-2 rounded-full mr-2 ${item.isAI ? "bg-red-500" : "bg-green-500"}`} />
                        <div className="flex flex-col">
                          <span className="font-semibold">{item.resultClassification}</span>
                          <span className="text-xs text-gray-500">{item.resultPercentage}% confidence</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.format}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{item.duration}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleViewDetails(item)} className="text-purple-600 hover:text-purple-900 mx-2 flex items-center">
                        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
