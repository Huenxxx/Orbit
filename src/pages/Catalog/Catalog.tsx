import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    TrendingUp,
    Star,
    Clock,
    Sparkles,
    ChevronDown,
    X,
    ExternalLink,
    Plus,
    Loader2,
    Gamepad2,
    Store
} from 'lucide-react';
import { rawgService, GENRES, STORES, type RAWGGame, type RAWGResponse } from '../../services/rawgApi';
import { useGamesStore, useUIStore } from '../../stores';
import './Catalog.css';

type CatalogTab = 'popular' | 'top_rated' | 'new_releases' | 'upcoming' | 'steam' | 'epic';

const tabs: { id: CatalogTab; label: string; icon: React.ReactNode }[] = [
    { id: 'popular', label: 'Populares', icon: <TrendingUp size={16} /> },
    { id: 'top_rated', label: 'Mejor valorados', icon: <Star size={16} /> },
    { id: 'new_releases', label: 'Novedades', icon: <Sparkles size={16} /> },
    { id: 'upcoming', label: 'Próximamente', icon: <Clock size={16} /> },
    { id: 'steam', label: 'Steam', icon: <Store size={16} /> },
    { id: 'epic', label: 'Epic Games', icon: <Store size={16} /> },
];

export function Catalog() {
    const [activeTab, setActiveTab] = useState<CatalogTab>('popular');
    const [games, setGames] = useState<RAWGGame[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState<string>('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [totalGames, setTotalGames] = useState(0);
    const [selectedGame, setSelectedGame] = useState<RAWGGame | null>(null);

    const { addGame } = useGamesStore();
    const { addNotification } = useUIStore();

    // Fetch games based on active tab
    const fetchGames = async (pageNum = 1, append = false) => {
        setIsLoading(true);
        try {
            let response: RAWGResponse;

            if (searchQuery) {
                response = await rawgService.searchGames(searchQuery, pageNum);
            } else if (selectedGenre) {
                response = await rawgService.getGamesByGenre(selectedGenre, pageNum);
            } else {
                switch (activeTab) {
                    case 'popular':
                        response = await rawgService.getPopularGames(pageNum);
                        break;
                    case 'top_rated':
                        response = await rawgService.getTopRated(pageNum);
                        break;
                    case 'new_releases':
                        response = await rawgService.getNewReleases(pageNum);
                        break;
                    case 'upcoming':
                        response = await rawgService.getUpcoming(pageNum);
                        break;
                    case 'steam':
                        response = await rawgService.getGamesByStore(STORES.STEAM, pageNum);
                        break;
                    case 'epic':
                        response = await rawgService.getGamesByStore(STORES.EPIC_GAMES, pageNum);
                        break;
                    default:
                        response = await rawgService.getPopularGames(pageNum);
                }
            }

            setGames(prev => append ? [...prev, ...response.results] : response.results);
            setHasMore(response.next !== null);
            setTotalGames(response.count);
            setPage(pageNum);
        } catch (error) {
            console.error('Error fetching games:', error);
            addNotification('error', 'Error al cargar juegos del catálogo');
        } finally {
            setIsLoading(false);
            setIsSearching(false);
        }
    };

    useEffect(() => {
        setPage(1);
        fetchGames(1, false);
    }, [activeTab, selectedGenre]);

    // Debounced search
    useEffect(() => {
        if (searchQuery) {
            setIsSearching(true);
            const timer = setTimeout(() => {
                fetchGames(1, false);
            }, 500);
            return () => clearTimeout(timer);
        } else if (searchQuery === '') {
            fetchGames(1, false);
        }
    }, [searchQuery]);

    const loadMore = () => {
        if (!isLoading && hasMore) {
            fetchGames(page + 1, true);
        }
    };

    const handleAddToLibrary = async (game: RAWGGame) => {
        try {
            await addGame({
                title: game.name,
                description: '',
                coverImage: game.background_image || '',
                platform: 'custom',
                developer: 'Desconocido',
                genres: game.genres?.map(g => g.name) || [],
                playtime: 0,
                status: 'not_started',
                tags: [],
                isFavorite: false,
                isInstalled: false,
                rating: game.rating,
                metacriticScore: game.metacritic || undefined,
                releaseDate: game.released,
            });
            addNotification('success', `"${game.name}" agregado a tu biblioteca`);
        } catch (error) {
            addNotification('error', 'Error al agregar el juego');
        }
    };

    const formatRating = (rating: number) => {
        return rating.toFixed(1);
    };

    const getMetacriticColor = (score: number | null) => {
        if (!score) return 'gray';
        if (score >= 75) return 'green';
        if (score >= 50) return 'yellow';
        return 'red';
    };

    return (
        <div className="catalog">
            {/* Header */}
            <header className="catalog-header">
                <div className="header-content">
                    <h1>Catálogo de Juegos</h1>
                    <p>Explora más de 800,000 juegos de todas las plataformas</p>
                </div>

                {/* Search */}
                <div className="catalog-search">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Buscar juegos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')}>
                            <X size={18} />
                        </button>
                    )}
                    {isSearching && <Loader2 size={18} className="spinner" />}
                </div>
            </header>

            {/* Tabs */}
            <div className="catalog-tabs">
                <div className="tabs-scroll">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setSearchQuery('');
                                setSelectedGenre('');
                            }}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Genre Filter */}
                <div className="genre-filter">
                    <select
                        value={selectedGenre}
                        onChange={(e) => {
                            setSelectedGenre(e.target.value);
                            setSearchQuery('');
                        }}
                    >
                        <option value="">Todos los géneros</option>
                        {GENRES.map(genre => (
                            <option key={genre.id} value={genre.slug}>{genre.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} />
                </div>
            </div>

            {/* Results Info */}
            <div className="catalog-info">
                {searchQuery ? (
                    <span>Resultados para "{searchQuery}": {totalGames.toLocaleString()} juegos</span>
                ) : selectedGenre ? (
                    <span>{GENRES.find(g => g.slug === selectedGenre)?.name}: {totalGames.toLocaleString()} juegos</span>
                ) : (
                    <span>{totalGames.toLocaleString()} juegos encontrados</span>
                )}
            </div>

            {/* Games Grid */}
            <div className="catalog-content">
                {isLoading && games.length === 0 ? (
                    <div className="loading-grid">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="game-skeleton">
                                <div className="skeleton-cover"></div>
                                <div className="skeleton-info">
                                    <div className="skeleton-title"></div>
                                    <div className="skeleton-meta"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : games.length > 0 ? (
                    <>
                        <motion.div
                            className="games-grid"
                            layout
                        >
                            <AnimatePresence>
                                {games.map((game, index) => (
                                    <motion.div
                                        key={game.id}
                                        className="catalog-game-card"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                        whileHover={{ y: -8 }}
                                        onClick={() => setSelectedGame(game)}
                                    >
                                        {/* Cover */}
                                        <div className="game-cover">
                                            {game.background_image ? (
                                                <img src={game.background_image} alt={game.name} loading="lazy" />
                                            ) : (
                                                <div className="no-cover">
                                                    <Gamepad2 size={32} />
                                                </div>
                                            )}

                                            {/* Overlay */}
                                            <div className="game-overlay">
                                                <button
                                                    className="btn-add-library"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAddToLibrary(game);
                                                    }}
                                                >
                                                    <Plus size={18} />
                                                    Agregar
                                                </button>
                                            </div>

                                            {/* Metacritic Badge */}
                                            {game.metacritic && (
                                                <div className={`metacritic-badge ${getMetacriticColor(game.metacritic)}`}>
                                                    {game.metacritic}
                                                </div>
                                            )}

                                            {/* Platforms */}
                                            <div className="game-platforms">
                                                {game.platforms?.slice(0, 4).map(p => (
                                                    <span key={p.platform.id} className="platform-icon" title={p.platform.name}>
                                                        {getPlatformIcon(p.platform.slug)}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="game-info">
                                            <h3>{game.name}</h3>
                                            <div className="game-meta">
                                                <span className="rating">
                                                    <Star size={12} fill="currentColor" />
                                                    {formatRating(game.rating)}
                                                </span>
                                                {game.released && (
                                                    <span className="release-date">
                                                        {new Date(game.released).getFullYear()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="game-genres">
                                                {game.genres?.slice(0, 2).map(g => (
                                                    <span key={g.id} className="genre-tag">{g.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </motion.div>

                        {/* Load More */}
                        {hasMore && (
                            <div className="load-more">
                                <button
                                    className="btn btn-secondary"
                                    onClick={loadMore}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="spinner" />
                                            Cargando...
                                        </>
                                    ) : (
                                        'Cargar más juegos'
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <Gamepad2 size={64} />
                        <h3>Sin resultados</h3>
                        <p>No se encontraron juegos con los filtros actuales</p>
                    </div>
                )}
            </div>

            {/* Game Detail Modal */}
            <AnimatePresence>
                {selectedGame && (
                    <GameDetailModal
                        game={selectedGame}
                        onClose={() => setSelectedGame(null)}
                        onAddToLibrary={handleAddToLibrary}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// Helper function for platform icons
function getPlatformIcon(slug: string): string {
    const icons: Record<string, string> = {
        pc: '🖥️',
        playstation: '🎮',
        playstation5: '🎮',
        playstation4: '🎮',
        xbox: '🎮',
        'xbox-one': '🎮',
        'xbox-series-x': '🎮',
        nintendo: '🎮',
        switch: '🕹️',
        ios: '📱',
        android: '📱',
        mac: '🍎',
        linux: '🐧',
    };
    return icons[slug] || '🎮';
}

// Game Detail Modal Component
function GameDetailModal({
    game,
    onClose,
    onAddToLibrary
}: {
    game: RAWGGame;
    onClose: () => void;
    onAddToLibrary: (game: RAWGGame) => void;
}) {
    const [screenshots, setScreenshots] = useState<{ id: number; image: string }[]>([]);
    const [activeScreenshot, setActiveScreenshot] = useState(0);

    useEffect(() => {
        // Use short_screenshots from the game data
        if (game.short_screenshots) {
            setScreenshots(game.short_screenshots);
        }
    }, [game]);

    return (
        <motion.div
            className="game-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="game-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header with background */}
                <div
                    className="modal-hero"
                    style={{ backgroundImage: `url(${screenshots[activeScreenshot]?.image || game.background_image})` }}
                >
                    <div className="hero-overlay">
                        <button className="modal-close" onClick={onClose}>
                            <X size={24} />
                        </button>

                        <div className="hero-content">
                            <h2>{game.name}</h2>
                            <div className="hero-meta">
                                {game.released && (
                                    <span>{new Date(game.released).toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                )}
                                <span className="rating-large">
                                    <Star size={18} fill="currentColor" />
                                    {game.rating.toFixed(1)}
                                </span>
                                {game.metacritic && (
                                    <span className={`metacritic-large ${game.metacritic >= 75 ? 'high' : game.metacritic >= 50 ? 'medium' : 'low'}`}>
                                        {game.metacritic}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Screenshots */}
                {screenshots.length > 1 && (
                    <div className="screenshots-row">
                        {screenshots.slice(0, 6).map((ss, index) => (
                            <button
                                key={ss.id}
                                className={`screenshot-thumb ${index === activeScreenshot ? 'active' : ''}`}
                                onClick={() => setActiveScreenshot(index)}
                            >
                                <img src={ss.image} alt={`Screenshot ${index + 1}`} />
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="modal-content">
                    {/* Genres & Platforms */}
                    <div className="modal-section">
                        <div className="tags-row">
                            {game.genres?.map(g => (
                                <span key={g.id} className="genre-pill">{g.name}</span>
                            ))}
                        </div>

                        <div className="platforms-row">
                            <span className="label">Plataformas:</span>
                            {game.platforms?.map(p => (
                                <span key={p.platform.id} className="platform-pill">
                                    {getPlatformIcon(p.platform.slug)} {p.platform.name}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="modal-stats">
                        <div className="stat">
                            <span className="stat-value">{game.ratings_count?.toLocaleString() || 0}</span>
                            <span className="stat-label">Valoraciones</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{game.playtime || '?'}h</span>
                            <span className="stat-label">Tiempo promedio</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{game.reviews_count?.toLocaleString() || 0}</span>
                            <span className="stat-label">Reseñas</span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="modal-actions">
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => {
                                onAddToLibrary(game);
                                onClose();
                            }}
                        >
                            <Plus size={20} />
                            Agregar a mi biblioteca
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
