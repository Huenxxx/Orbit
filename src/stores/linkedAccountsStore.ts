import { create } from 'zustand';

// Types for linked accounts
export interface SteamGame {
    appid: number;
    name: string;
    playtime_forever: number; // minutes
    playtime_2weeks?: number;
    img_icon_url: string;
    img_logo_url: string;
    has_community_visible_stats?: boolean;
}

export interface EpicGame {
    id: string;
    title: string;
    namespace: string;
    image: string;
}

export interface LinkedAccount {
    platform: 'steam' | 'epic';
    userId: string;
    username: string;
    avatarUrl?: string;
    linkedAt: string;
    lastSync?: string;
}

interface LinkedAccountsState {
    steamAccount: LinkedAccount | null;
    epicAccount: LinkedAccount | null;
    steamGames: SteamGame[];
    epicGames: EpicGame[];
    isLinkingSteam: boolean;
    isLinkingEpic: boolean;
    isSyncingSteam: boolean;
    isSyncingEpic: boolean;
    error: string | null;

    // Actions
    linkSteamAccount: (steamId: string) => Promise<boolean>;
    linkEpicAccount: () => Promise<boolean>;
    unlinkSteamAccount: () => void;
    unlinkEpicAccount: () => void;
    syncSteamGames: () => Promise<void>;
    syncEpicGames: () => Promise<void>;
    loadLinkedAccounts: () => void;
}

// Storage keys
const STORAGE_KEY_STEAM = 'orbit-linked-steam';
const STORAGE_KEY_EPIC = 'orbit-linked-epic';
const STORAGE_KEY_STEAM_GAMES = 'orbit-steam-games';
const STORAGE_KEY_EPIC_GAMES = 'orbit-epic-games';

export const useLinkedAccountsStore = create<LinkedAccountsState>((set, get) => ({
    steamAccount: null,
    epicAccount: null,
    steamGames: [],
    epicGames: [],
    isLinkingSteam: false,
    isLinkingEpic: false,
    isSyncingSteam: false,
    isSyncingEpic: false,
    error: null,

    loadLinkedAccounts: () => {
        try {
            // Load Steam account
            const steamData = localStorage.getItem(STORAGE_KEY_STEAM);
            if (steamData) {
                const steam = JSON.parse(steamData);
                set({ steamAccount: steam });
            }

            // Load Epic account
            const epicData = localStorage.getItem(STORAGE_KEY_EPIC);
            if (epicData) {
                const epic = JSON.parse(epicData);
                set({ epicAccount: epic });
            }

            // Load Steam games
            const steamGamesData = localStorage.getItem(STORAGE_KEY_STEAM_GAMES);
            if (steamGamesData) {
                set({ steamGames: JSON.parse(steamGamesData) });
            }

            // Load Epic games
            const epicGamesData = localStorage.getItem(STORAGE_KEY_EPIC_GAMES);
            if (epicGamesData) {
                set({ epicGames: JSON.parse(epicGamesData) });
            }
        } catch (error) {
            console.error('Error loading linked accounts:', error);
        }
    },

    linkSteamAccount: async (steamId: string) => {
        set({ isLinkingSteam: true, error: null });

        try {
            // Validate Steam ID format (should be 17 digits)
            const cleanSteamId = steamId.trim();

            // Try to fetch user profile to validate
            // Note: In production, this would be done through your backend
            // For now, we'll create a mock connection

            const account: LinkedAccount = {
                platform: 'steam',
                userId: cleanSteamId,
                username: `Steam User ${cleanSteamId.slice(-4)}`,
                avatarUrl: `https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg`,
                linkedAt: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEY_STEAM, JSON.stringify(account));
            set({ steamAccount: account, isLinkingSteam: false });

            // Sync games after linking
            await get().syncSteamGames();

            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLinkingSteam: false });
            return false;
        }
    },

    linkEpicAccount: async () => {
        set({ isLinkingEpic: true, error: null });

        try {
            // Epic Games requires OAuth authentication
            // For demonstration, we'll create a mock connection

            const account: LinkedAccount = {
                platform: 'epic',
                userId: 'epic_' + Date.now(),
                username: 'Epic Player',
                avatarUrl: undefined,
                linkedAt: new Date().toISOString()
            };

            localStorage.setItem(STORAGE_KEY_EPIC, JSON.stringify(account));
            set({ epicAccount: account, isLinkingEpic: false });

            // Sync games after linking
            await get().syncEpicGames();

            return true;
        } catch (error) {
            set({ error: (error as Error).message, isLinkingEpic: false });
            return false;
        }
    },

    unlinkSteamAccount: () => {
        localStorage.removeItem(STORAGE_KEY_STEAM);
        localStorage.removeItem(STORAGE_KEY_STEAM_GAMES);
        set({ steamAccount: null, steamGames: [] });
    },

    unlinkEpicAccount: () => {
        localStorage.removeItem(STORAGE_KEY_EPIC);
        localStorage.removeItem(STORAGE_KEY_EPIC_GAMES);
        set({ epicAccount: null, epicGames: [] });
    },

    syncSteamGames: async () => {
        const { steamAccount } = get();
        if (!steamAccount) return;

        set({ isSyncingSteam: true, error: null });

        try {
            // In a real implementation, you would call your backend API
            // which would fetch games from Steam Web API
            // For demo purposes, we'll use mock data

            const mockSteamGames: SteamGame[] = [
                {
                    appid: 730,
                    name: "Counter-Strike 2",
                    playtime_forever: 12540,
                    img_icon_url: "8dbc71957312bbd3baea65848b545be9eae2a355",
                    img_logo_url: "d0595ff02f5c79fd19b06f4d6165c3fda2372820"
                },
                {
                    appid: 570,
                    name: "Dota 2",
                    playtime_forever: 8760,
                    img_icon_url: "0bbb630d63262dd66d2fdd0f7d37e8661a410075",
                    img_logo_url: "d4f836839254be08d8e9dd333ecc9a01782c26d2"
                },
                {
                    appid: 440,
                    name: "Team Fortress 2",
                    playtime_forever: 3420,
                    img_icon_url: "e3f595a92552da3d664ad00277fad2107345f748",
                    img_logo_url: "07385eb55b5ba974aebbe74d3c99626bda7920b8"
                },
                {
                    appid: 1091500,
                    name: "Cyberpunk 2077",
                    playtime_forever: 1850,
                    img_icon_url: "c4bf3a8da602b04dd9e78b93b5c9499d9898b248",
                    img_logo_url: "5e0e6c7389a4893987e4cbe0a6c7e45e9dd1c34c"
                },
                {
                    appid: 1245620,
                    name: "Elden Ring",
                    playtime_forever: 2340,
                    img_icon_url: "6bb0ff78a29c667396c848a0e4ee9a1108bc8f6e",
                    img_logo_url: "6bb0ff78a29c667396c848a0e4ee9a1108bc8f6e"
                },
                {
                    appid: 892970,
                    name: "Valheim",
                    playtime_forever: 890,
                    img_icon_url: "6bb0ff78a29c667396c848a0e4ee9a1108bc8f6e",
                    img_logo_url: "6bb0ff78a29c667396c848a0e4ee9a1108bc8f6e"
                }
            ];

            localStorage.setItem(STORAGE_KEY_STEAM_GAMES, JSON.stringify(mockSteamGames));
            set({
                steamGames: mockSteamGames,
                isSyncingSteam: false,
                steamAccount: {
                    ...steamAccount,
                    lastSync: new Date().toISOString()
                }
            });

            // Update stored account with lastSync
            const updatedAccount = { ...steamAccount, lastSync: new Date().toISOString() };
            localStorage.setItem(STORAGE_KEY_STEAM, JSON.stringify(updatedAccount));

        } catch (error) {
            set({ error: (error as Error).message, isSyncingSteam: false });
        }
    },

    syncEpicGames: async () => {
        const { epicAccount } = get();
        if (!epicAccount) return;

        set({ isSyncingEpic: true, error: null });

        try {
            // Mock Epic Games data
            const mockEpicGames: EpicGame[] = [
                {
                    id: "fortnite",
                    title: "Fortnite",
                    namespace: "fn",
                    image: "https://cdn2.unrealengine.com/fortnite-chapter-4-logo-512x512-86c0dfa51e9f.png"
                },
                {
                    id: "rocket-league",
                    title: "Rocket League",
                    namespace: "rl",
                    image: "https://cdn2.unrealengine.com/rl-logo-512-512-1930517.png"
                },
                {
                    id: "fall-guys",
                    title: "Fall Guys",
                    namespace: "fg",
                    image: "https://cdn2.unrealengine.com/fallguys-512-512-512x512-14c43ef9b3b5.png"
                },
                {
                    id: "alan-wake-2",
                    title: "Alan Wake 2",
                    namespace: "aw2",
                    image: "https://cdn2.unrealengine.com/aw2-512-512-512x512.png"
                },
                {
                    id: "gta-v",
                    title: "Grand Theft Auto V",
                    namespace: "gtav",
                    image: "https://cdn2.unrealengine.com/gtav-512-512.png"
                }
            ];

            localStorage.setItem(STORAGE_KEY_EPIC_GAMES, JSON.stringify(mockEpicGames));
            set({
                epicGames: mockEpicGames,
                isSyncingEpic: false,
                epicAccount: {
                    ...epicAccount,
                    lastSync: new Date().toISOString()
                }
            });

            // Update stored account with lastSync
            const updatedAccount = { ...epicAccount, lastSync: new Date().toISOString() };
            localStorage.setItem(STORAGE_KEY_EPIC, JSON.stringify(updatedAccount));

        } catch (error) {
            set({ error: (error as Error).message, isSyncingEpic: false });
        }
    }
}));
