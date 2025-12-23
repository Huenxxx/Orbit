// RAWG API Service - Free Video Game Database
// Docs: https://rawg.io/apidocs

const RAWG_API_KEY = 'e8a665f55bea447597809825abe87ee2';
const BASE_URL = 'https://api.rawg.io/api';

export interface RAWGGame {
    id: number;
    slug: string;
    name: string;
    released: string;
    tba: boolean;
    background_image: string;
    rating: number;
    rating_top: number;
    ratings_count: number;
    reviews_count: number;
    metacritic: number | null;
    playtime: number;
    updated: string;
    added: number;
    genres: { id: number; name: string; slug: string }[];
    platforms: { platform: { id: number; name: string; slug: string } }[];
    stores: { store: { id: number; name: string; slug: string } }[] | null;
    tags: { id: number; name: string; slug: string }[];
    short_screenshots: { id: number; image: string }[];
    esrb_rating: { id: number; name: string; slug: string } | null;
}

export interface RAWGGameDetails extends RAWGGame {
    description: string;
    description_raw: string;
    website: string;
    developers: { id: number; name: string; slug: string }[];
    publishers: { id: number; name: string; slug: string }[];
    reddit_url: string;
    metacritic_url: string;
}

export interface RAWGResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: RAWGGame[];
}

export interface SearchParams {
    search?: string;
    page?: number;
    page_size?: number;
    platforms?: string;
    genres?: string;
    ordering?: string;
    dates?: string;
    metacritic?: string;
    stores?: string;
    exclude_additions?: boolean;
    parent_platforms?: string;
}

// Platform IDs
export const PLATFORMS = {
    PC: 4,
    PLAYSTATION_5: 187,
    PLAYSTATION_4: 18,
    XBOX_SERIES: 186,
    XBOX_ONE: 1,
    NINTENDO_SWITCH: 7,
    IOS: 3,
    ANDROID: 21,
    MACOS: 5,
    LINUX: 6,
};

// Store IDs
export const STORES = {
    STEAM: 1,
    PLAYSTATION_STORE: 3,
    XBOX_STORE: 2,
    APP_STORE: 4,
    GOG: 5,
    NINTENDO_STORE: 6,
    XBOX_360_STORE: 7,
    GOOGLE_PLAY: 8,
    ITCH_IO: 9,
    EPIC_GAMES: 11,
};

// Genre slugs
export const GENRES = [
    { id: 4, slug: 'action', name: 'Acción' },
    { id: 51, slug: 'indie', name: 'Indie' },
    { id: 3, slug: 'adventure', name: 'Aventura' },
    { id: 5, slug: 'rpg', name: 'RPG' },
    { id: 10, slug: 'strategy', name: 'Estrategia' },
    { id: 2, slug: 'shooter', name: 'Shooter' },
    { id: 40, slug: 'casual', name: 'Casual' },
    { id: 14, slug: 'simulation', name: 'Simulación' },
    { id: 7, slug: 'puzzle', name: 'Puzzle' },
    { id: 11, slug: 'arcade', name: 'Arcade' },
    { id: 83, slug: 'platformer', name: 'Plataformas' },
    { id: 1, slug: 'racing', name: 'Carreras' },
    { id: 59, slug: 'massively-multiplayer', name: 'MMO' },
    { id: 15, slug: 'sports', name: 'Deportes' },
    { id: 6, slug: 'fighting', name: 'Lucha' },
    { id: 19, slug: 'family', name: 'Familiar' },
];

class RAWGService {
    private apiKey: string;
    private baseUrl: string;

    constructor() {
        this.apiKey = RAWG_API_KEY;
        this.baseUrl = BASE_URL;
    }

    private async fetch<T>(endpoint: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        // Add API key
        if (this.apiKey) {
            url.searchParams.append('key', this.apiKey);
        }

        // Add other params - URL class handles encoding automatically (including spaces)
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.append(key, String(value));
            }
        });

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`RAWG API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // Filter results to remove low-quality entries
    private filterResults(response: RAWGResponse, minRatingsCount = 10): RAWGResponse {
        return {
            ...response,
            results: response.results.filter(game => {
                // Must have an image
                if (!game.background_image) return false;
                // Must have some ratings (filters out unknown games)
                if (game.ratings_count < minRatingsCount) return false;
                // Must have at least one genre
                if (!game.genres || game.genres.length === 0) return false;
                return true;
            })
        };
    }

    // Get list of games with filters - excludes DLCs and additions by default
    async getGames(params: SearchParams = {}): Promise<RAWGResponse> {
        const response = await this.fetch<RAWGResponse>('/games', {
            page: params.page || 1,
            page_size: params.page_size || 40,
            search: params.search || '',
            platforms: params.platforms || '',
            genres: params.genres || '',
            ordering: params.ordering || '-added',
            dates: params.dates || '',
            metacritic: params.metacritic || '',
            stores: params.stores || '',
            exclude_additions: params.exclude_additions ?? true,
            parent_platforms: params.parent_platforms || '1,2,3,7',
        });

        return this.filterResults(response, params.search ? 5 : 50);
    }

    // Get popular/trending games (high quality only)
    async getPopularGames(page = 1): Promise<RAWGResponse> {
        const currentYear = new Date().getFullYear();
        const response = await this.fetch<RAWGResponse>('/games', {
            page,
            page_size: 40,
            ordering: '-added',
            dates: `${currentYear - 2}-01-01,${currentYear}-12-31`,
            exclude_additions: true,
            parent_platforms: '1,2,3,7',
        });
        return this.filterResults(response, 100);
    }

    // Get top rated games (metacritic 75+)
    async getTopRated(page = 1): Promise<RAWGResponse> {
        const response = await this.fetch<RAWGResponse>('/games', {
            page,
            page_size: 40,
            ordering: '-metacritic',
            metacritic: '75,100',
            exclude_additions: true,
            parent_platforms: '1,2,3,7',
        });
        return this.filterResults(response, 100);
    }

    // Get upcoming games
    async getUpcoming(page = 1): Promise<RAWGResponse> {
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response = await this.fetch<RAWGResponse>('/games', {
            page,
            page_size: 40,
            ordering: 'released',
            dates: `${today},${nextYear}`,
            exclude_additions: true,
            parent_platforms: '1,2,3,7',
        });
        return this.filterResults(response, 0);
    }

    // Get new releases
    async getNewReleases(page = 1): Promise<RAWGResponse> {
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = new Date().toISOString().split('T')[0];
        const response = await this.fetch<RAWGResponse>('/games', {
            page,
            page_size: 40,
            ordering: '-released',
            dates: `${sixtyDaysAgo},${today}`,
            exclude_additions: true,
            parent_platforms: '1,2,3,7',
        });
        return this.filterResults(response, 20);
    }

    // Search games - DO NOT use ordering, let RAWG handle search relevance
    async searchGames(query: string, page = 1): Promise<RAWGResponse> {
        // Normalize query: convert arabic numbers to roman numerals for better matching
        let normalizedQuery = query.trim()
            .replace(/\b1\b/g, 'I')
            .replace(/\b2\b/g, 'II')
            .replace(/\b3\b/g, 'III')
            .replace(/\b4\b/g, 'IV')
            .replace(/\b5\b/g, 'V')
            .replace(/\b6\b/g, 'VI');

        // IMPORTANT: When using 'search', do NOT specify 'ordering'
        // This lets RAWG use its native search relevance algorithm
        // Also DON'T exclude_additions for Definitive Editions / Remasters
        const response = await this.fetch<RAWGResponse>('/games', {
            search: normalizedQuery,
            page,
            page_size: 40,
            // NO exclude_additions - we want Definitive Editions to appear
            // NO ordering parameter - let RAWG sort by relevance
        });

        // Very light filtering for search - only require image
        const filtered: RAWGResponse = {
            ...response,
            results: response.results.filter(game => game.background_image)
        };

        // Additional client-side sorting to prioritize matches
        const queryLower = query.toLowerCase().trim();
        const normalizedLower = normalizedQuery.toLowerCase();
        const queryWords = queryLower.split(/\s+/);
        const normalizedWords = normalizedLower.split(/\s+/);

        filtered.results.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            // Normalize game names too for comparison
            const aNameNorm = aName
                .replace(/\bi\b/g, '1').replace(/\bii\b/g, '2').replace(/\biii\b/g, '3')
                .replace(/\biv\b/g, '4').replace(/\bv\b/g, '5').replace(/\bvi\b/g, '6');
            const queryNorm = queryLower
                .replace(/\b1\b/g, '1').replace(/\b2\b/g, '2').replace(/\b3\b/g, '3');

            // Calculate relevance score
            const getScore = (name: string, nameNorm: string): number => {
                // Exact match (original or normalized)
                if (name === queryLower || name === normalizedLower) return 10000;

                // Contains full query
                if (name.includes(queryLower) || name.includes(normalizedLower)) return 8000;

                // Starts with query
                if (name.startsWith(queryLower) || name.startsWith(normalizedLower)) return 7000;

                // All query words found in name (flexible matching)
                const nameWords = name.split(/[\s\-:,]+/);
                const allQueryWordsFound = queryWords.every(qw =>
                    nameWords.some(nw => nw.includes(qw) || nw.startsWith(qw))
                );
                const allNormWordsFound = normalizedWords.every(qw =>
                    nameWords.some(nw => nw.includes(qw) || nw.startsWith(qw))
                );
                if (allQueryWordsFound || allNormWordsFound) return 5000;

                // Count matching words
                const matchCount = queryWords.filter(qw =>
                    nameWords.some(nw => nw.includes(qw))
                ).length;

                return matchCount * 1000;
            };

            const aScore = getScore(aName, aNameNorm);
            const bScore = getScore(bName, bName);

            if (aScore !== bScore) return bScore - aScore;

            // Same relevance? Sort by popularity
            return (b.ratings_count || 0) - (a.ratings_count || 0);
        });

        return filtered;
    }

    // Get games from specific store (only popular ones)
    async getGamesByStore(storeId: number, page = 1): Promise<RAWGResponse> {
        const response = await this.fetch<RAWGResponse>('/games', {
            stores: String(storeId),
            page,
            page_size: 40,
            ordering: '-added',
            exclude_additions: true,
        });
        return this.filterResults(response, 100);
    }

    // Get games by genre
    async getGamesByGenre(genreSlug: string, page = 1): Promise<RAWGResponse> {
        const response = await this.fetch<RAWGResponse>('/games', {
            genres: genreSlug,
            page,
            page_size: 40,
            ordering: '-added',
            exclude_additions: true,
            parent_platforms: '1,2,3,7',
        });
        return this.filterResults(response, 50);
    }

    // Get game details
    async getGameDetails(id: number): Promise<RAWGGameDetails> {
        return this.fetch<RAWGGameDetails>(`/games/${id}`);
    }

    // Get game screenshots
    async getGameScreenshots(id: number): Promise<{ results: { id: number; image: string }[] }> {
        return this.fetch(`/games/${id}/screenshots`);
    }

    // Get game trailers
    async getGameTrailers(id: number): Promise<{ results: { id: number; name: string; preview: string; data: { max: string } }[] }> {
        return this.fetch(`/games/${id}/movies`);
    }

    // Get similar games
    async getSimilarGames(id: number): Promise<RAWGResponse> {
        return this.fetch(`/games/${id}/suggested`);
    }
}

export const rawgService = new RAWGService();
export default rawgService;
