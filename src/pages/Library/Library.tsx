import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Grid3X3,
    List,
    LayoutGrid,
    Plus,
    SlidersHorizontal,
    ChevronDown,
    X,
    Gamepad2
} from 'lucide-react';
import { useGamesStore, useUIStore } from '../../stores';
import { GameCard } from '../../components/GameCard/GameCard';
import { AddGameModal } from '../../components/AddGameModal/AddGameModal';
import type { Game, ViewMode, SortOption } from '../../types';
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
        resetFilters
    } = useGamesStore();

    const { openModal, closeModal, modalOpen } = useUIStore();
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadGames();
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

    const hasActiveFilters = filters.platforms.length > 0 || filters.status.length > 0 || filters.tags.length > 0;

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

    return (
        <div className="library">
            {/* Header */}
            <header className="library-header">
                <div className="header-title">
                    <h1>Biblioteca</h1>
                    <span className="game-count">{games.length} juegos</span>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => openModal('add-game')}
                >
                    <Plus size={18} />
                    Agregar juego
                </button>
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
                ) : filteredGames.length > 0 ? (
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
                ) : (
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
                                : 'Agrega tu primer juego para comenzar'
                            }
                        </p>
                        {!searchQuery && !hasActiveFilters && (
                            <button
                                className="btn btn-primary"
                                onClick={() => openModal('add-game')}
                            >
                                <Plus size={18} /> Agregar juego
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add Game Modal */}
            <AnimatePresence>
                {modalOpen === 'add-game' && (
                    <AddGameModal onClose={closeModal} />
                )}
            </AnimatePresence>
        </div>
    );
}
