// Steam API Service for Orbit
// This service handles all Steam API calls from the main process

const STEAM_API_KEY = '41653837E79D81640C4299F9984FB885';
const STEAM_API_BASE = 'https://api.steampowered.com';
const STEAM_STORE_API = 'https://store.steampowered.com/api';

/**
 * Fetches the list of owned games for a Steam user
 * @param {string} steamId - The 64-bit Steam ID of the user
 * @returns {Promise<{success: boolean, games?: Array, error?: string}>}
 */
async function getOwnedGames(steamId) {
    try {
        const url = `${STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.response || !data.response.games) {
            return {
                success: false,
                error: 'No se encontraron juegos. Asegúrate de que tu perfil de Steam es público.',
                games: []
            };
        }

        // Transform the games to our format
        const games = data.response.games.map(game => ({
            appid: game.appid,
            name: game.name,
            playtime_forever: game.playtime_forever || 0,
            playtime_2weeks: game.playtime_2weeks || 0,
            img_icon_url: game.img_icon_url || '',
            img_logo_url: game.img_logo_url || '',
            has_community_visible_stats: game.has_community_visible_stats || false,
            // Build proper image URLs
            iconUrl: game.img_icon_url
                ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
                : null,
            headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
            capsuleUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_231x87.jpg`
        }));

        // Sort by playtime (most played first)
        games.sort((a, b) => b.playtime_forever - a.playtime_forever);

        return {
            success: true,
            games: games,
            gameCount: data.response.game_count
        };

    } catch (error) {
        console.error('Error fetching Steam games:', error);
        return {
            success: false,
            error: error.message || 'Error al conectar con Steam',
            games: []
        };
    }
}

/**
 * Fetches Steam user profile information
 * @param {string} steamId - The 64-bit Steam ID of the user
 * @returns {Promise<{success: boolean, profile?: Object, error?: string}>}
 */
async function getPlayerSummary(steamId) {
    try {
        const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.response || !data.response.players || data.response.players.length === 0) {
            return {
                success: false,
                error: 'No se encontró el perfil de Steam. Verifica tu Steam ID.'
            };
        }

        const player = data.response.players[0];

        return {
            success: true,
            profile: {
                steamId: player.steamid,
                personaName: player.personaname,
                profileUrl: player.profileurl,
                avatar: player.avatar,
                avatarMedium: player.avatarmedium,
                avatarFull: player.avatarfull,
                personaState: player.personastate, // 0-Offline, 1-Online, 2-Busy, 3-Away, 4-Snooze, 5-Looking to trade, 6-Looking to play
                communityVisibilityState: player.communityvisibilitystate, // 1-Private, 3-Public
                profileState: player.profilestate,
                lastLogoff: player.lastlogoff,
                realName: player.realname,
                countryCode: player.loccountrycode
            }
        };

    } catch (error) {
        console.error('Error fetching Steam profile:', error);
        return {
            success: false,
            error: error.message || 'Error al obtener perfil de Steam'
        };
    }
}

/**
 * Resolves a Steam vanity URL to a Steam ID
 * @param {string} vanityName - The vanity URL name (custom URL)
 * @returns {Promise<{success: boolean, steamId?: string, error?: string}>}
 */
async function resolveVanityURL(vanityName) {
    try {
        const url = `${STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key=${STEAM_API_KEY}&vanityurl=${vanityName}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (data.response.success === 1) {
            return {
                success: true,
                steamId: data.response.steamid
            };
        } else {
            return {
                success: false,
                error: 'No se encontró el perfil con ese nombre personalizado'
            };
        }

    } catch (error) {
        console.error('Error resolving vanity URL:', error);
        return {
            success: false,
            error: error.message || 'Error al resolver URL de Steam'
        };
    }
}

/**
 * Fetches recently played games for a user
 * @param {string} steamId - The 64-bit Steam ID
 * @returns {Promise<{success: boolean, games?: Array, error?: string}>}
 */
async function getRecentlyPlayedGames(steamId) {
    try {
        const url = `${STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&count=10&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.response || !data.response.games) {
            return {
                success: true,
                games: []
            };
        }

        const games = data.response.games.map(game => ({
            appid: game.appid,
            name: game.name,
            playtime_2weeks: game.playtime_2weeks || 0,
            playtime_forever: game.playtime_forever || 0,
            headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`
        }));

        return {
            success: true,
            games: games
        };

    } catch (error) {
        console.error('Error fetching recently played games:', error);
        return {
            success: false,
            error: error.message,
            games: []
        };
    }
}

/**
 * Gets player achievements for a specific game
 * @param {string} steamId - The 64-bit Steam ID
 * @param {number} appId - The Steam App ID of the game
 * @returns {Promise<{success: boolean, achievements?: Array, error?: string}>}
 */
async function getPlayerAchievements(steamId, appId) {
    try {
        const url = `${STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&appid=${appId}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            // Game might not have achievements
            return { success: true, achievements: [] };
        }

        const data = await response.json();

        if (!data.playerstats || !data.playerstats.achievements) {
            return { success: true, achievements: [] };
        }

        return {
            success: true,
            achievements: data.playerstats.achievements
        };

    } catch (error) {
        return { success: true, achievements: [] };
    }
}

export const steamService = {
    getOwnedGames,
    getPlayerSummary,
    resolveVanityURL,
    getRecentlyPlayedGames,
    getPlayerAchievements
};
