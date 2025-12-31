import { auth } from './firebase';

const SERVER_URL = 'http://localhost:5270/api'; // Dev URL

export const serverApi = {
    // Helper to get headers with Auth Token
    async getModules() {
        const user = auth?.currentUser;
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        if (user) {
            const token = await user.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    },

    // Test Status (Public)
    async checkStatus() {
        try {
            const response = await fetch(`${SERVER_URL}/status`);
            return await response.json();
        } catch (error) {
            console.error('Server status check failed:', error);
            throw error;
        }
    },

    // Get My Profile (Protected)
    async getMyProfile() {
        try {
            const headers = await this.getModules();
            const response = await fetch(`${SERVER_URL}/me`, {
                headers
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${errorText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Get profile failed:', error);
            throw error;
        }
    }
};
