import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Grid3X3,
    List,
    Plus,
    SlidersHorizontal,
    ChevronDown,
    X,
    Gamepad2,
    Link2,
    ChevronRight
} from 'lucide-react';
import { useGamesStore, useUIStore } from '../../stores';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import { GameCard } from '../../components/GameCard/GameCard';
import { AddGameModal } from '../../components/AddGameModal/AddGameModal';
import { EditGameModal } from '../../components/EditGameModal/EditGameModal';
import { LinkAccountsModal } from '../../components/LinkAccountsModal/LinkAccountsModal';
import type { SortOption } from '../../types';
import './Library.css';

const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'lastPlayed', label: 'Último jugado' },
    { value: 'name', label: 'Nombre' },
    { value: 'playtime', label: 'Tiempo de juego' },
    { value: 'dateAdded', label: 'Fecha de adición' },
    { value: 'rating', label: 'Valoración' },
];

const platformFilters = [
    { value: 'steam', label: 'Steam' },
    { value: 'epic', label: 'Epic Games' },
    { value: 'gog', label: 'GOG' },
    { value: 'minecraft', label: 'Minecraft' },
    { value: 'custom', label: 'Personalizado' },
];

const statusFilters = [
    { value: 'not_started', label: 'Sin empezar' },
    { value: 'playing', label: 'Jugando' },
    { value: 'completed', label: 'Completado' },
    { value: 'on_hold', label: 'En pausa' },
    { value: 'dropped', label: 'Abandonado' },
];

export function Library() {
    const {
        games,
        loadGames,
        isLoading,
        viewMode,
        setViewMode,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder,
        filters,
        setFilters,
        resetFilters,
        selectedGame,
        setSelectedGame
    } = useGamesStore();

    const { openModal, closeModal, modalOpen } = useUIStore();
    const {
        steamAccount,
        epicAccount,
        steamGames,
        epicGames,
        loadLinkedAccounts
    } = useLinkedAccountsStore();

    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSteam, setExpandedSteam] = useState(true);
    const [expandedEpic, setExpandedEpic] = useState(true);

    useEffect(() => {
        loadGames();
        loadLinkedAccounts();
    }, []);

    // Filter and sort games
    const filteredGames = useMemo(() => {
        let result = [...games];

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(game =>
                game.title.toLowerCase().includes(query) ||
                game.developer.toLowerCase().includes(query) ||
                game.genres.some(g => g.toLowerCase().includes(query))
            );
        }

        // Platform filter
        if (filters.platforms.length > 0) {
            result = result.filter(game => filters.platforms.includes(game.platform));
        }

        // Status filter
        if (filters.status.length > 0) {
            result = result.filter(game => filters.status.includes(game.status));
        }

        // Tags filter
        if (filters.tags.length > 0) {
            result = result.filter(game =>
                game.tags.some(tag => filters.tags.includes(tag))
            );
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = a.title.localeCompare(b.title);
                    break;
                case 'lastPlayed':
                    comparison = (new Date(b.lastPlayed || 0).getTime()) - (new Date(a.lastPlayed || 0).getTime());
                    break;
                case 'playtime':
                    comparison = b.playtime - a.playtime;
                    break;
                case 'dateAdded':
                    comparison = new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
                    break;
                case 'rating':
                    comparison = (b.rating || 0) - (a.rating || 0);
                    break;
            }

            return sortOrder === 'asc' ? -comparison : comparison;
        });

        return result;
    }, [games, searchQuery, filters, sortBy, sortOrder]);

    // Filter Steam games by search
    const filteredSteamGames = useMemo(() => {
        if (!searchQuery) return steamGames;
        const query = searchQuery.toLowerCase();
        return steamGames.filter(game => game.name.toLowerCase().includes(query));
    }, [steamGames, searchQuery]);

    // Filter Epic games by search
    const filteredEpicGames = useMemo(() => {
        if (!searchQuery) return epicGames;
        const query = searchQuery.toLowerCase();
        return epicGames.filter(game => game.title.toLowerCase().includes(query));
    }, [epicGames, searchQuery]);

    const hasActiveFilters = filters.platforms.length > 0 || filters.status.length > 0 || filters.tags.length > 0;
    const hasLinkedAccounts = steamAccount || epicAccount;
    const totalGamesCount = games.length + steamGames.length + epicGames.length;

    const togglePlatformFilter = (platform: string) => {
        const current = filters.platforms;
        const updated = current.includes(platform as any)
            ? current.filter(p => p !== platform)
            : [...current, platform as any];
        setFilters({ platforms: updated });
    };

    const toggleStatusFilter = (status: string) => {
        const current = filters.status;
        const updated = current.includes(status as any)
            ? current.filter(s => s !== status)
            : [...current, status as any];
        setFilters({ status: updated });
    };

    const formatPlaytime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        if (hours < 1) return `${minutes} min`;
        return `${hours.toLocaleString()} hrs`;
    };

    return (
        <div className="library">
            {/* Header */}
            <header className="library-header">
                <div className="header-title">
                    <h1>Biblioteca</h1>
                    <span className="game-count">{totalGamesCount} juegos</span>
                </div>

                <div className="header-actions">
                    <button
                        className="btn btn-link-accounts"
                        onClick={() => openModal('link-accounts')}
                    >
                        <Link2 size={18} />
                        Vincular cuentas
                        {hasLinkedAccounts && <span className="linked-badge" />}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => openModal('add-game')}
                    >
                        <Plus size={18} />
                        Agregar juego
                    </button>
                </div>
            </header>

            {/* Toolbar */}
            <div className="library-toolbar">
                {/* Search */}
                <div className="search-box">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar juegos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button
                            className="search-clear"
                            onClick={() => setSearchQuery('')}
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filter & Sort */}
                <div className="toolbar-actions">
                    <button
                        className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <SlidersHorizontal size={16} />
                        Filtros
                        {hasActiveFilters && <span className="filter-badge">!</span>}
                    </button>

                    <div className="sort-dropdown">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="sort-select"
                        >
                            {sortOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <button
                            className="sort-order"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                        >
                            <ChevronDown
                                size={16}
                                style={{ transform: sortOrder === 'asc' ? 'rotate(180deg)' : 'none' }}
                            />
                        </button>
                    </div>

                    {/* View Mode */}
                    <div className="view-toggle">
                        <button
                            className={viewMode === 'grid' ? 'active' : ''}
                            onClick={() => setViewMode('grid')}
                            title="Vista de cuadrícula"
                        >
                            <Grid3X3 size={18} />
                        </button>
                        <button
                            className={viewMode === 'list' ? 'active' : ''}
                            onClick={() => setViewMode('list')}
                            title="Vista de lista"
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        className="filters-panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <div className="filters-content">
                            <div className="filter-group">
                                <h4>Plataforma</h4>
                                <div className="filter-chips">
                                    {platformFilters.map(pf => (
                                        <button
                                            key={pf.value}
                                            className={`filter-chip ${filters.platforms.includes(pf.value as any) ? 'active' : ''}`}
                                            onClick={() => togglePlatformFilter(pf.value)}
                                        >
                                            {pf.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="filter-group">
                                <h4>Estado</h4>
                                <div className="filter-chips">
                                    {statusFilters.map(sf => (
                                        <button
                                            key={sf.value}
                                            className={`filter-chip ${filters.status.includes(sf.value as any) ? 'active' : ''}`}
                                            onClick={() => toggleStatusFilter(sf.value)}
                                        >
                                            {sf.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <button className="btn btn-ghost" onClick={resetFilters}>
                                    <X size={14} /> Limpiar filtros
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Games Content */}
            <div className="library-content">
                {isLoading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Cargando biblioteca...</p>
                    </div>
                ) : (
                    <>
                        {/* Steam Games Section */}
                        {steamAccount && filteredSteamGames.length > 0 && (
                            <motion.section
                                className="platform-section steam-section"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <button
                                    className="section-header"
                                    onClick={() => setExpandedSteam(!expandedSteam)}
                                >
                                    <div className="section-title">
                                        <div className="platform-badge steam">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.936 3.589 9.021 8.305 9.818l2.682-3.837c-.024.001-.048.002-.073.002-1.893 0-3.449-1.476-3.571-3.343L5.246 12.37C5.088 11.591 5 10.803 5 10c0-3.866 3.134-7 7-7s7 3.134 7 7c0 .803-.088 1.591-.246 2.37l-4.839 1.846A3.58 3.58 0 0 0 12 14c-.025 0-.049-.001-.073-.002l2.682 3.837C19.411 21.021 23 16.936 23 12 23 6.477 18.523 2 12 2z" />
                                            </svg>
                                        </div>
                                        <h2>Steam</h2>
                                        <span className="section-count">{filteredSteamGames.length}</span>
                                    </div>
                                    <ChevronRight
                                        size={20}
                                        className={`expand-icon ${expandedSteam ? 'expanded' : ''}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {expandedSteam && (
                                        <motion.div
                                            className="section-content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                        >
                                            <div className="platform-games-grid">
                                                {filteredSteamGames.map((game, index) => (
                                                    <motion.div
                                                        key={game.appid}
                                                        className="platform-game-card steam-game"
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: index * 0.02 }}
                                                    >
                                                        <div className="game-image">
                                                            <img
                                                                src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                                                alt={game.name}
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/460x215?text=No+Image';
                                                                }}
                                                            />
                                                            <div className="steam-overlay">
                                                                <Gamepad2 size={24} />
                                                            </div>
                                                        </div>
                                                        <div className="game-info">
                                                            <h4>{game.name}</h4>
                                                            <span className="playtime">{formatPlaytime(game.playtime_forever)}</span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.section>
                        )}

                        {/* Epic Games Section */}
                        {epicAccount && filteredEpicGames.length > 0 && (
                            <motion.section
                                className="platform-section epic-section"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <button
                                    className="section-header"
                                    onClick={() => setExpandedEpic(!expandedEpic)}
                                >
                                    <div className="section-title">
                                        <div className="platform-badge epic">
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                                <path d="M3 2v20h18V2H3zm15 17H6V5h12v14zM8 7v10h2V7H8z" />
                                            </svg>
                                        </div>
                                        <h2>Epic Games</h2>
                                        <span className="section-count">{filteredEpicGames.length}</span>
                                    </div>
                                    <ChevronRight
                                        size={20}
                                        className={`expand-icon ${expandedEpic ? 'expanded' : ''}`}
                                    />
                                </button>

                                <AnimatePresence>
                                    {expandedEpic && (
                                        <motion.div
                                            className="section-content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                        >
                                            <div className="platform-games-grid">
                                                {filteredEpicGames.map((game, index) => (
                                                    <motion.div
                                                        key={game.id}
                                                        className="platform-game-card epic-game"
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: index * 0.02 }}
                                                    >
                                                        <div className="game-image epic-placeholder">
                                                            <Gamepad2 size={32} />
                                                        </div>
                                                        <div className="game-info">
                                                            <h4>{game.title}</h4>
                                                            <span className="platform-label">Epic Games</span>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.section>
                        )}

                        {/* Manual Library Section */}
                        {(filteredGames.length > 0 || (!steamAccount && !epicAccount)) && (
                            <motion.section
                                className="platform-section library-section"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                {(steamAccount || epicAccount) && filteredGames.length > 0 && (
                                    <div className="section-header static">
                                        <div className="section-title">
                                            <div className="platform-badge custom">
                                                <Gamepad2 size={20} />
                                            </div>
                                            <h2>Mi Biblioteca</h2>
                                            <span className="section-count">{filteredGames.length}</span>
                                        </div>
                                    </div>
                                )}

                                {filteredGames.length > 0 ? (
                                    <motion.div
                                        className={`games-container ${viewMode}`}
                                        layout
                                    >
                                        <AnimatePresence mode="popLayout">
                                            {filteredGames.map((game, index) => (
                                                <motion.div
                                                    key={game.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ delay: index * 0.02 }}
                                                >
                                                    <GameCard game={game} variant={viewMode} />
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </motion.div>
                                ) : !steamAccount && !epicAccount ? (
                                    <div className="empty-state">
                                        <div className="empty-icon">
                                            <Gamepad2 size={64} />
                                        </div>
                                        <h3>
                                            {searchQuery || hasActiveFilters
                                                ? 'Sin resultados'
                                                : 'Tu biblioteca está vacía'
                                            }
                                        </h3>
                                        <p>
                                            {searchQuery || hasActiveFilters
                                                ? 'Intenta ajustar los filtros o la búsqueda'
                                                : 'Agrega tu primer juego o vincula tus cuentas de Steam/Epic'
                                            }
                                        </p>
                                        <div className="empty-actions">
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => openModal('add-game')}
                                            >
                                                <Plus size={18} /> Agregar juego
                                            </button>
                                            <button
                                                className="btn btn-link-accounts-secondary"
                                                onClick={() => openModal('link-accounts')}
                                            >
                                                <Link2 size={18} /> Vincular cuentas
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </motion.section>
                        )}

                        {/* No results state when searching with linked accounts */}
                        {searchQuery && filteredGames.length === 0 && filteredSteamGames.length === 0 && filteredEpicGames.length === 0 && (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <Search size={64} />
                                </div>
                                <h3>Sin resultados</h3>
                                <p>No se encontraron juegos que coincidan con "{searchQuery}"</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Add Game Modal */}
            <AnimatePresence>
                {modalOpen === 'add-game' && (
                    <AddGameModal onClose={closeModal} />
                )}
            </AnimatePresence>

            {/* Edit Game Modal */}
            <AnimatePresence>
                {modalOpen === 'edit-game' && selectedGame && (
                    <EditGameModal
                        game={selectedGame}
                        onClose={() => { closeModal(); setSelectedGame(null); }}
                    />
                )}
            </AnimatePresence>

            {/* Link Accounts Modal */}
            <AnimatePresence>
                {modalOpen === 'link-accounts' && (
                    <LinkAccountsModal onClose={closeModal} />
                )}
            </AnimatePresence>
        </div>
    );
}

