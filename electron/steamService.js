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

/**
 * Gets the Steam level for a user
 * @param {string} steamId - The 64-bit Steam ID
 * @returns {Promise<{success: boolean, level?: number, error?: string}>}
 */
async function getSteamLevel(steamId) {
    try {
        const url = `${STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return {
            success: true,
            level: data.response?.player_level || 0
        };

    } catch (error) {
        console.error('Error fetching Steam level:', error);
        return { success: false, error: error.message, level: 0 };
    }
}

/**
 * Gets the Steam badges for a user
 * @param {string} steamId - The 64-bit Steam ID
 * @returns {Promise<{success: boolean, badges?: Array, playerXp?: number, playerLevel?: number, error?: string}>}
 */
async function getSteamBadges(steamId) {
    try {
        const url = `${STEAM_API_BASE}/IPlayerService/GetBadges/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.response) {
            return { success: true, badges: [], playerXp: 0, playerLevel: 0 };
        }

        return {
            success: true,
            badges: data.response.badges || [],
            playerXp: data.response.player_xp || 0,
            playerLevel: data.response.player_level || 0,
            playerXpNeededToLevelUp: data.response.player_xp_needed_to_level_up || 0,
            playerXpNeededCurrentLevel: data.response.player_xp_needed_current_level || 0
        };

    } catch (error) {
        console.error('Error fetching Steam badges:', error);
        return { success: false, error: error.message, badges: [] };
    }
}

/**
 * Gets the friend list for a user
 * @param {string} steamId - The 64-bit Steam ID
 * @returns {Promise<{success: boolean, friends?: Array, error?: string}>}
 */
async function getFriendList(steamId) {
    try {
        const url = `${STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&relationship=friend&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 401) {
                return { success: false, error: 'Lista de amigos privada', friends: [] };
            }
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.friendslist || !data.friendslist.friends) {
            return { success: true, friends: [] };
        }

        return {
            success: true,
            friends: data.friendslist.friends.map(friend => ({
                steamId: friend.steamid,
                relationship: friend.relationship,
                friendSince: friend.friend_since
            }))
        };

    } catch (error) {
        console.error('Error fetching friend list:', error);
        return { success: false, error: error.message, friends: [] };
    }
}

/**
 * Gets detailed summaries for multiple Steam users (up to 100)
 * Useful for getting online status and current game for friends
 * @param {string[]} steamIds - Array of 64-bit Steam IDs
 * @returns {Promise<{success: boolean, players?: Array, error?: string}>}
 */
async function getPlayersSummaries(steamIds) {
    try {
        if (!steamIds || steamIds.length === 0) {
            return { success: true, players: [] };
        }

        // Steam API allows up to 100 IDs per request
        const ids = steamIds.slice(0, 100).join(',');
        const url = `${STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${ids}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.response || !data.response.players) {
            return { success: true, players: [] };
        }

        // Map persona states to readable strings
        const stateMap = {
            0: 'offline',
            1: 'online',
            2: 'busy',
            3: 'away',
            4: 'snooze',
            5: 'looking_to_trade',
            6: 'looking_to_play'
        };

        const players = data.response.players.map(player => ({
            steamId: player.steamid,
            personaName: player.personaname,
            profileUrl: player.profileurl,
            avatar: player.avatar,
            avatarMedium: player.avatarmedium,
            avatarFull: player.avatarfull,
            personaState: player.personastate,
            personaStateString: stateMap[player.personastate] || 'offline',
            // Current game info (only present if in-game)
            currentGame: player.gameid ? {
                gameId: player.gameid,
                gameName: player.gameextrainfo || 'Unknown Game',
                serverIp: player.gameserverip
            } : null,
            lastLogoff: player.lastlogoff,
            realName: player.realname,
            countryCode: player.loccountrycode
        }));

        return {
            success: true,
            players
        };

    } catch (error) {
        console.error('Error fetching players summaries:', error);
        return { success: false, error: error.message, players: [] };
    }
}

/**
 * Gets friends with their current status and game info
 * Combines getFriendList and getPlayersSummaries
 * @param {string} steamId - The 64-bit Steam ID of the user
 * @returns {Promise<{success: boolean, friends?: Array, error?: string}>}
 */
async function getFriendsWithStatus(steamId) {
    try {
        // First get the friend list
        const friendListResult = await getFriendList(steamId);

        if (!friendListResult.success || !friendListResult.friends || friendListResult.friends.length === 0) {
            return friendListResult;
        }

        // Get all friend Steam IDs
        const friendIds = friendListResult.friends.map(f => f.steamId);

        // Get detailed info for all friends (in batches of 100)
        const allPlayers = [];
        for (let i = 0; i < friendIds.length; i += 100) {
            const batch = friendIds.slice(i, i + 100);
            const summariesResult = await getPlayersSummaries(batch);
            if (summariesResult.success && summariesResult.players) {
                allPlayers.push(...summariesResult.players);
            }
        }

        // Create a map for quick lookup
        const playerMap = new Map(allPlayers.map(p => [p.steamId, p]));

        // Combine friend list with player info
        const friends = friendListResult.friends.map(friend => {
            const playerInfo = playerMap.get(friend.steamId);
            return {
                ...friend,
                ...playerInfo
            };
        });

        // Sort: online/in-game first, then by name
        friends.sort((a, b) => {
            // In-game players first
            if (a.currentGame && !b.currentGame) return -1;
            if (!a.currentGame && b.currentGame) return 1;
            // Then online players
            if (a.personaState > 0 && b.personaState === 0) return -1;
            if (a.personaState === 0 && b.personaState > 0) return 1;
            // Then by name
            return (a.personaName || '').localeCompare(b.personaName || '');
        });

        return {
            success: true,
            friends
        };

    } catch (error) {
        console.error('Error fetching friends with status:', error);
        return { success: false, error: error.message, friends: [] };
    }
}

/**
 * Gets the number of current players for a specific game
 * @param {number} appId - The Steam App ID of the game
 * @returns {Promise<{success: boolean, playerCount?: number, error?: string}>}
 */
async function getCurrentPlayerCount(appId) {
    try {
        const url = `${STEAM_API_BASE}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appId}&format=json`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Steam API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return {
            success: true,
            playerCount: data.response?.player_count || 0
        };

    } catch (error) {
        console.error('Error fetching player count:', error);
        return { success: false, error: error.message, playerCount: 0 };
    }
}

export const steamService = {
    getOwnedGames,
    getPlayerSummary,
    resolveVanityURL,
    getRecentlyPlayedGames,
    getPlayerAchievements,
    getCurrentPlayerCount,
    getSteamLevel,
    getSteamBadges,
    getFriendList,
    getPlayersSummaries,
    getFriendsWithStatus
};
