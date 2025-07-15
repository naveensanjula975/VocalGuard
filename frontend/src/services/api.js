const API_BASE_URL = 'http://localhost:8000';

export const api = {
    signup: async (userData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            }); if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Signup failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    }, verifyToken: async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/protected`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Token verification failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Token verification failed');
        }
    },

    login: async (credentials) => {
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle Firebase specific errors
                if (data.detail && data.detail.includes('FIREBASE_ERROR:')) {
                    throw new Error(data.detail);
                }
                throw new Error(data.detail || 'Login failed');
            }

            // Ensure we have all required fields
            if (!data.token || !data.user_id || !data.username) {
                console.error('Login response missing required fields:', data);
                throw new Error('Incomplete login data received from server');
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }, detectDeepfake: async (formData, token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/detect-deepfake/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Detection failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    }, detectDeepfakeAdvanced: async (formData, token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/detect-deepfake-advanced/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Advanced detection failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    },

    detectDeepfakeDemo: async (formData) => {
        try {
            const response = await fetch(`${API_BASE_URL}/detect-deepfake-demo`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Detection failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    },

    getUserAnalyses: async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/user/analyses`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to retrieve analyses');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    },

    getAnalysisById: async (analysisId, token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/analyses/${analysisId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to retrieve analysis');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    },

    generateDummyData: async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/generate-dummy-data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate dummy data');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    },

    deleteAnalyses: async (analysisIds, token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/analyses/delete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ analysis_ids: analysisIds }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete analyses');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    },

    deleteAnalysis: async (analysisId, token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/analyses/${analysisId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to delete analysis');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    }
};