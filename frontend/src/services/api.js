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
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Signup failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
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

            return data;
        } catch (error) {
            throw error;
        }
    },

    uploadFile: async (formData, token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Upload failed');
            }

            return response.json();
        } catch (error) {
            throw new Error(error.message || 'Network error');
        }
    }
}; 