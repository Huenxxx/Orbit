// Game Matching Service
// Automatically identifies and enriches games in the library, even repacks

import { rawgService } from './rawgApi';
import type { Game } from '../types';

// Common repack/scene group patterns to remove from titles
const REPACK_PATTERNS = [
    // Scene groups
    /\b(CODEX|SKIDROW|CPY|PLAZA|HOODLUM|EMPRESS|FitGirl|DODI|Repack|ElAmigos)\b/gi,
    // Version patterns
    /\b(v\d+[\d.]*|\d+\.\d+[\d.]*)\b/gi,
    // Build patterns  
    /\b(Build[\s.-]?\d+|Update[\s.-]?\d+)\b/gi,
    // Edition patterns
    /\((Repack|Remastered|GOTY|Game of the Year|Deluxe|Ultimate|Complete|Gold|Enhanced|Definitive)(\s+Edition)?\)/gi,
    /\[(Repack|Remastered|GOTY|Game of the Year|Deluxe|Ultimate|Complete|Gold|Enhanced|Definitive)(\s+Edition)?\]/gi,
    // Extra stuff
    /\[.*?\]/g,       // Everything in brackets
    /\(.*?\)/g,       // Everything in parentheses (optional, might remove important info)
    /[-_]\s*(x64|x86|64bit|32bit)/gi,
    /[-_]\s*(Multi\d+)/gi,
    /\s*[-–—]\s*$/,   // Trailing dashes
    /\s+/g,           // Multiple spaces -> single space
];

// Clean title for searching
function cleanGameTitle(title: string): string {
    let cleaned = title.trim();

    // Apply patterns
    for (const pattern of REPACK_PATTERNS) {
        cleaned = cleaned.replace(pattern, ' ');
    }

    // Clean up extra spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove trailing/leading special chars
    cleaned = cleaned.replace(/^[^\w]+|[^\w]+$/g, '');

    return cleaned;
}

// Calculate similarity between two strings (simple Levenshtein-based)
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1.0;

    // One contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
        return 0.9;
    }

    // Word-based comparison
    const words1 = s1.split(/\s+/).filter(w => w.length > 2);
    const words2 = s2.split(/\s+/).filter(w => w.length > 2);

    if (words1.length === 0 || words2.length === 0) return 0;

    const matchingWords = words1.filter(w1 =>
        words2.some(w2 => w2.includes(w1) || w1.includes(w2))
    );

    return matchingWords.length / Math.max(words1.length, words2.length);
}

export interface MatchResult {
    matched: boolean;
    rawgId?: number;
    rawgSlug?: string;
    confidence: number;
    enrichedData?: Partial<Game>;
    originalTitle?: string;
}

class GameMatchingService {
    private matchCache: Map<string, MatchResult> = new Map();

    // Match a game title to RAWG database
    async matchGame(title: string): Promise<MatchResult> {
        const cleanedTitle = cleanGameTitle(title);

        // Check cache first
        const cacheKey = cleanedTitle.toLowerCase();
        if (this.matchCache.has(cacheKey)) {
            return this.matchCache.get(cacheKey)!;
        }

        try {
            console.log(`🎮 Matching game: "${title}" -> cleaned: "${cleanedTitle}"`);

            // Search RAWG
            const response = await rawgService.searchGames(cleanedTitle, 1);

            if (!response.results || response.results.length === 0) {
                const result: MatchResult = {
                    matched: false,
                    confidence: 0,
                    originalTitle: title
                };
                this.matchCache.set(cacheKey, result);
                return result;
            }

            // Find best match
            let bestMatch = response.results[0];
            let bestSimilarity = calculateSimilarity(cleanedTitle, bestMatch.name);

            for (const game of response.results.slice(1, 5)) {
                const similarity = calculateSimilarity(cleanedTitle, game.name);
                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = game;
                }
            }

            // Require at least 60% similarity
            if (bestSimilarity < 0.6) {
                console.log(`❌ No good match found for "${cleanedTitle}" (best: ${bestMatch.name} at ${(bestSimilarity * 100).toFixed(0)}%)`);
                const result: MatchResult = {
                    matched: false,
                    confidence: bestSimilarity,
                    originalTitle: title
                };
                this.matchCache.set(cacheKey, result);
                return result;
            }

            console.log(`✅ Matched "${cleanedTitle}" -> "${bestMatch.name}" (${(bestSimilarity * 100).toFixed(0)}% confidence)`);

            // Enrich with game details
            const enrichedData = await this.enrichGameData(bestMatch);

            const result: MatchResult = {
                matched: true,
                rawgId: bestMatch.id,
                rawgSlug: bestMatch.slug,
                confidence: bestSimilarity,
                enrichedData,
                originalTitle: title
            };

            this.matchCache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('Error matching game:', error);
            return {
                matched: false,
                confidence: 0,
                originalTitle: title
            };
        }
    }

    // Enrich game data from RAWG
    private async enrichGameData(rawgGame: any): Promise<Partial<Game>> {
        try {
            // Get detailed info
            const details = await rawgService.getGameDetails(rawgGame.id);

            // Get screenshots
            let screenshots: string[] = [];
            try {
                const screenshotData = await rawgService.getGameScreenshots(rawgGame.id);
                screenshots = screenshotData.results.slice(0, 6).map(s => s.image);
            } catch (e) {
                // Screenshots are optional
            }

            // Get trailer
            let trailerUrl: string | undefined;
            try {
                const trailerData = await rawgService.getGameTrailers(rawgGame.id);
                if (trailerData.results.length > 0) {
                    trailerUrl = trailerData.results[0].data.max;
                }
            } catch (e) {
                // Trailers are optional
            }

            return {
                title: rawgGame.name,
                description: details.description_raw || details.description || '',
                coverImage: rawgGame.background_image || '',
                backgroundImage: rawgGame.background_image,
                screenshots,
                trailerUrl,
                genres: rawgGame.genres?.map((g: any) => g.name) || [],
                developer: details.developers?.[0]?.name || '',
                publisher: details.publishers?.[0]?.name || '',
                releaseDate: rawgGame.released,
                rating: rawgGame.rating,
                metacriticScore: rawgGame.metacritic || undefined,
                rawgId: rawgGame.id,
                rawgSlug: rawgGame.slug,
                autoMatched: true
            };
        } catch (error) {
            console.error('Error enriching game data:', error);
            // Return basic data
            return {
                title: rawgGame.name,
                coverImage: rawgGame.background_image || '',
                backgroundImage: rawgGame.background_image,
                genres: rawgGame.genres?.map((g: any) => g.name) || [],
                releaseDate: rawgGame.released,
                rating: rawgGame.rating,
                metacriticScore: rawgGame.metacritic || undefined,
                rawgId: rawgGame.id,
                rawgSlug: rawgGame.slug,
                autoMatched: true
            };
        }
    }

    // Auto-match and enrich a game
    async autoMatchAndEnrich(game: Partial<Game>): Promise<Game> {
        // If already matched, skip
        if (game.rawgId) {
            return game as Game;
        }

        const title = game.title || '';
        if (!title) {
            return game as Game;
        }

        const matchResult = await this.matchGame(title);

        if (matchResult.matched && matchResult.enrichedData) {
            // Merge enriched data with original game, preserving user's data
            return {
                ...matchResult.enrichedData,
                ...game,
                // Override with enriched data for these fields if user didn't provide
                title: game.title || matchResult.enrichedData.title || title,
                description: game.description || matchResult.enrichedData.description || '',
                coverImage: game.coverImage || matchResult.enrichedData.coverImage || '',
                backgroundImage: game.backgroundImage || matchResult.enrichedData.backgroundImage,
                screenshots: game.screenshots?.length ? game.screenshots : matchResult.enrichedData.screenshots,
                trailerUrl: game.trailerUrl || matchResult.enrichedData.trailerUrl,
                genres: game.genres?.length ? game.genres : (matchResult.enrichedData.genres || []),
                developer: game.developer || matchResult.enrichedData.developer || '',
                publisher: game.publisher || matchResult.enrichedData.publisher,
                releaseDate: game.releaseDate || matchResult.enrichedData.releaseDate,
                rating: game.rating || matchResult.enrichedData.rating,
                metacriticScore: game.metacriticScore || matchResult.enrichedData.metacriticScore,
                rawgId: matchResult.rawgId,
                rawgSlug: matchResult.rawgSlug,
                autoMatched: true,
                originalTitle: matchResult.originalTitle !== matchResult.enrichedData?.title ? matchResult.originalTitle : undefined
            } as Game;
        }

        // No match found, return original
        return game as Game;
    }

    // Batch match multiple games
    async batchMatch(games: Partial<Game>[]): Promise<Game[]> {
        const results: Game[] = [];

        for (const game of games) {
            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
            const enriched = await this.autoMatchAndEnrich(game);
            results.push(enriched);
        }

        return results;
    }

    // Re-match an existing game (for manual retry)
    async rematchGame(game: Game): Promise<Game> {
        // Clear cache for this game
        const cleanedTitle = cleanGameTitle(game.originalTitle || game.title);
        this.matchCache.delete(cleanedTitle.toLowerCase());

        // Reset RAWG fields
        const gameWithoutMatch = {
            ...game,
            rawgId: undefined,
            rawgSlug: undefined,
            autoMatched: undefined
        };

        return this.autoMatchAndEnrich(gameWithoutMatch);
    }

    // Clear match cache
    clearCache() {
        this.matchCache.clear();
    }
}

export const gameMatchingService = new GameMatchingService();
export default gameMatchingService;
