// ─────────────────────────────────────────────
// API Service — VocalGuard Frontend
// ─────────────────────────────────────────────
// Centralised HTTP layer.  Every endpoint goes through `request()`,
// which handles headers, auth, JSON parsing, and error shaping in
// one place so individual methods stay tiny and consistent.
// ─────────────────────────────────────────────

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── Private helper ──────────────────────────
/**
 * Generic fetch wrapper.
 *
 * @param {string}  endpoint  - URL path (relative to API_BASE_URL)
 * @param {object}  options
 * @param {string}  [options.method='GET']
 * @param {string}  [options.token]       - Bearer token for protected routes
 * @param {object}  [options.body]        - JSON body (auto-stringified)
 * @param {FormData}[options.formData]    - Multipart body (takes precedence over body)
 * @returns {Promise<any>}
 */
async function request(endpoint, { method = 'GET', token, body, formData } = {}) {
    const headers = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set Content-Type for JSON bodies; fetch sets it automatically for FormData
    if (body && !formData) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: formData ?? (body ? JSON.stringify(body) : undefined),
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data?.detail || `Request failed (${response.status})`;
            throw new Error(message);
        }

        return data;
    } catch (error) {
        // Re-throw with a consistent shape
        throw new Error(error.message || 'Network error');
    }
}

// ── Public API ──────────────────────────────
export const api = {
    // ─── Auth ───────────────────────────────
    signup: (userData) =>
        request('/signup', { method: 'POST', body: userData }),

    login: (credentials) =>
        request('/login', { method: 'POST', body: credentials }),

    verifyToken: (token) =>
        request('/protected', { token }),

    sendPasswordResetLink: (email) =>
        request('/forgot-password', { method: 'POST', body: { email } }),

    // ─── Detection ─────────────────────────
    detectDeepfake: (formData, token) =>
        request('/detect-deepfake/', { method: 'POST', token, formData }),

    detectDeepfakeAdvanced: (formData, token) =>
        request('/detect-deepfake-advanced/', { method: 'POST', token, formData }),

    detectDeepfakeDemo: (formData) =>
        request('/detect-deepfake-demo', { method: 'POST', formData }),

    // ─── Analyses CRUD ─────────────────────
    getUserAnalyses: (token) =>
        request('/data/analyses', { token }),

    getAnalysisById: (analysisId, token) =>
        request(`/analyses/${analysisId}`, { token }),

    deleteAnalysis: (analysisId, token) =>
        request(`/analyses/${analysisId}`, { method: 'DELETE', token }),

    deleteAnalyses: (analysisIds, token) =>
        request('/analyses/delete', {
            method: 'POST',
            token,
            body: { analysis_ids: analysisIds },
        }),

    // ─── Debug / Demo ──────────────────────
    generateDummyData: (token) =>
        request('/generate-dummy-data', { method: 'POST', token }),
};