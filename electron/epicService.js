import axios from 'axios';

const GRAPHQL_URL = 'https://graphql.epicgames.com/graphql';
const API_URL = 'https://api.epicgames.dev/epic';

export const epicService = {
    /**
     * Get user profile summary
     */
    async getPlayerSummary(accessToken, accountId) {
        try {
            const response = await axios.get(`${API_URL}/id/v1/accounts/${accountId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            return { success: true, profile: response.data };
        } catch (error) {
            console.error('Error getting Epic profile:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get owned games (entitlements)
     * Note: This usually requires a GraphQL query or specific entitlement endpoint
     */
    async getOwnedGames(accessToken, accountId) {
        try {
            // This is a simplified GraphQL query for owned games
            const query = `
                query getEntitlements($accountId: String!) {
                    Launcher {
                        entitlements(accountId: $accountId) {
                            entitlementName
                            namespace
                            catalogItemId
                        }
                    }
                }
            `;

            const response = await axios.post(GRAPHQL_URL, {
                query,
                variables: { accountId }
            }, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (response.data.errors) {
                throw new Error(response.data.errors[0].message);
            }

            const entitlements = response.data.data.Launcher.entitlements;

            // Map entitlements to a more useful game format
            // In a real app, you'd fetch catalog details for each entitlement
            const games = entitlements.map(e => ({
                id: e.catalogItemId,
                name: e.entitlementName, // Often internal name, needs catalog lookup
                namespace: e.namespace,
                platform: 'epic'
            }));

            return { success: true, games };
        } catch (error) {
            console.error('Error fetching Epic games:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get Epic friends with status
     */
    async getFriendsWithStatus(accessToken, accountId) {
        try {
            const response = await axios.get(`${API_URL}/friends/v1/${accountId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const friends = response.data.friends || [];

            // Map Epic friends to Orbit format
            const mappedFriends = friends.map(f => ({
                epicId: f.accountId,
                displayName: f.displayName || 'Epic User',
                status: f.status === 'ONLINE' ? 'online' : 'offline',
                presence: f.presence || null
            }));

            return { success: true, friends: mappedFriends };
        } catch (error) {
            console.error('Error fetching Epic friends:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get achievements for a specific game
     */
    async getPlayerAchievements(accessToken, accountId, namespace, appId) {
        try {
            // Achievements are often tied to namespace (catalog entry)
            const response = await axios.get(`${API_URL}/achievements/v1/${accountId}/namespaces/${namespace}/apps/${appId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            return { success: true, achievements: response.data.achievements || [] };
        } catch (error) {
            console.error('Error fetching Epic achievements:', error);
            return { success: false, error: error.message };
        }
    }
};
