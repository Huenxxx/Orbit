import React, { useEffect, useState, useMemo } from 'react';
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
    Play,
    FolderOpen,
    ExternalLink,
    RefreshCw,
    Download,
    Trash2
} from 'lucide-react';
import { useGamesStore, useUIStore } from '../../stores';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import { useLaunchersStore, type InstalledGame } from '../../stores/launchersStore';
import { AddGameModal } from '../../components/AddGameModal/AddGameModal';
import { EditGameModal } from '../../components/EditGameModal/EditGameModal';
import { LinkAccountsModal } from '../../components/LinkAccountsModal/LinkAccountsModal';
import { GameContextMenu, type ContextMenuItem } from '../../components/GameContextMenu';
import { useNotificationStore } from '../../stores/notificationStore';
import type { SortOption, Game } from '../../types';
import './Library.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'lastPlayed', label: 'Último jugado' },
    { value: 'name', label: 'Nombre' },
    { value: 'playtime', label: 'Tiempo de juego' },
    { value: 'dateAdded', label: 'Fecha de adición' },
    { value: 'rating', label: 'Valoración' },
];

const statusFilters = [
    { value: 'not_started', label: 'Sin empezar' },
    { value: 'playing', label: 'Jugando' },
    { value: 'completed', label: 'Completado' },
    { value: 'on_hold', label: 'En pausa' },
    { value: 'dropped', label: 'Abandonado' },
];

// Platform config
const platformConfig: { id: string; label: string; icon: React.ReactElement; color: string }[] = [
    {
        id: 'steam',
        label: 'Steam',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.936 3.589 9.021 8.305 9.818l2.682-3.837c-.024.001-.048.002-.073.002-1.893 0-3.449-1.476-3.571-3.343L5.246 12.37C5.088 11.591 5 10.803 5 10c0-3.866 3.134-7 7-7s7 3.134 7 7c0 .803-.088 1.591-.246 2.37l-4.839 1.846A3.58 3.58 0 0 0 12 14c-.025 0-.049-.001-.073-.002l2.682 3.837C19.411 21.021 23 16.936 23 12 23 6.477 18.523 2 12 2z" />
            </svg>
        ),
        color: '#66c0f4'
    },
    {
        id: 'epic',
        label: 'Epic',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M3 2v20h18V2H3zm15 17H6V5h12v14zM8 7v10h2V7H8z" />
            </svg>
        ),
        color: '#ffffff'
    },
    {
        id: 'gog',
        label: 'GOG',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-10h4v4h-4z" />
            </svg>
        ),
        color: '#86328a'
    },
    {
        id: 'ea',
        label: 'EA',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
        ),
        color: '#ff4747'
    },
    {
        id: 'ubisoft',
        label: 'Ubisoft',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7z" />
            </svg>
        ),
        color: '#0070ff'
    }
];

// Platform colors for styling
const platformColors: Record<string, { bg: string; color: string; hover: string }> = {
    steam: { bg: 'linear-gradient(135deg, #1b2838, #2a475e)', color: '#66c0f4', hover: 'rgba(102, 192, 244, 0.4)' },
    epic: { bg: 'linear-gradient(135deg, #121212, #2a2a2a)', color: '#ffffff', hover: 'rgba(255, 255, 255, 0.3)' },
    gog: { bg: 'linear-gradient(135deg, #5c2d91, #86328a)', color: '#ffffff', hover: 'rgba(134, 50, 138, 0.4)' },
    ea: { bg: 'linear-gradient(135deg, #ff4747, #e94040)', color: '#ffffff', hover: 'rgba(255, 71, 71, 0.4)' },
    ubisoft: { bg: 'linear-gradient(135deg, #0070ff, #003dad)', color: '#ffffff', hover: 'rgba(0, 112, 255, 0.4)' },
};

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
        setSelectedGame,
        deleteGame
    } = useGamesStore();

    const { openModal, closeModal, modalOpen, navigateTo, openConfirmModal } = useUIStore();
    const {
        steamAccount,
        epicAccount,
        steamGames,
        epicGames,
        loadLinkedAccounts,
        launchSteamGame
    } = useLinkedAccountsStore();

    const {
        allInstalledGames,
        epicInfo,
        gogInfo,
        eaInfo,
        ubisoftInfo,
        detectAllLaunchers,
        launchGame: launchPlatformGame,
        isLoading: isLoadingLaunchers
    } = useLaunchersStore();

    const { showGameStarted, showError, showSuccess } = useNotificationStore();

    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    // Context menu state
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        items: ContextMenuItem[];
    } | null>(null);

    useEffect(() => {
        loadGames();
        loadLinkedAccounts();
        detectAllLaunchers();
    }, []);

    // Combine all games into one unified list
    interface UnifiedGame {
        id: string;
        name: string;
        platform: string;
        imageUrl?: string;
        playtime?: number;
        installPath?: string;
        appId?: number;
        isInstalled: boolean;
        originalGame?: Game;
        installedGame?: InstalledGame;
    }

    const allGames = useMemo(() => {
        const unified: UnifiedGame[] = [];

        // Add Steam games (Steam games from API may or may not be installed)
        if (steamAccount) {
            steamGames.forEach(game => {
                unified.push({
                    id: `steam_${game.appid}`,
                    name: game.name,
                    platform: 'steam',
                    imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
                    playtime: game.playtime_forever,
                    appId: game.appid,
                    isInstalled: true // Steam API returns owned games, assume installed
                });
            });
        }

        // Add Epic games (Epic games from API may or may not be installed)
        if (epicAccount) {
            epicGames.forEach(game => {
                // Check if already in unified (e.g. from installed games)
                const isInstalled = allInstalledGames.some(ig => ig.platform === 'epic' && (ig.id === game.id || ig.name === game.title));

                if (!isInstalled) {
                    unified.push({
                        id: `epic_${game.id}`,
                        name: game.title,
                        platform: 'epic',
                        imageUrl: game.image,
                        isInstalled: false,
                        originalGame: undefined
                    });
                }
            });
        }

        // Add other platform games (these are detected as installed)
        allInstalledGames.forEach(game => {
            unified.push({
                id: `${game.platform}_${game.id}`,
                name: game.name,
                platform: game.platform,
                imageUrl: game.headerUrl,
                installPath: game.installPath,
                installedGame: game,
                isInstalled: true
            });
        });

        // Add manual library games
        games.forEach(game => {
            unified.push({
                id: `custom_${game.id}`,
                name: game.title,
                platform: game.platform,
                imageUrl: game.coverImage,
                playtime: game.playtime,
                originalGame: game,
                isInstalled: game.isInstalled || !!game.executablePath
            });
        });

        return unified;
    }, [steamAccount, epicAccount, steamGames, epicGames, allInstalledGames, games]);

    // Filter games
    const filteredGames = useMemo(() => {
        let result: UnifiedGame[] = [];

        // Always include custom/library games
        const customGames = allGames.filter(g => g.originalGame !== undefined);
        result = [...customGames];

        // Only include platform games if their chip is selected
        if (selectedPlatform) {
            const platformGames = allGames.filter(g =>
                g.platform === selectedPlatform && g.originalGame === undefined
            );
            result = [...result, ...platformGames];
        }

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(game => game.name.toLowerCase().includes(query));
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'playtime':
                    comparison = (b.playtime || 0) - (a.playtime || 0);
                    break;
                default:
                    comparison = a.name.localeCompare(b.name);
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [allGames, searchQuery, selectedPlatform, sortBy, sortOrder]);

    const hasActiveFilters = filters.status.length > 0 || selectedPlatform !== null;
    const hasLinkedAccounts = steamAccount || epicAccount;
    const hasDetectedLaunchers = epicInfo?.installed || gogInfo?.installed || eaInfo?.installed || ubisoftInfo?.installed;

    // Get platform counts
    const platformCounts = useMemo(() => {
        const counts: Record<string, number> = {
            steam: steamGames.length,
            epic: allInstalledGames.filter(g => g.platform === 'epic').length,
            gog: allInstalledGames.filter(g => g.platform === 'gog').length,
            ea: allInstalledGames.filter(g => g.platform === 'ea').length,
            ubisoft: allInstalledGames.filter(g => g.platform === 'ubisoft').length,
        };
        return counts;
    }, [steamGames, allInstalledGames]);

    const formatPlaytime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        if (hours < 1) return `${minutes} min`;
        return `${hours.toLocaleString()} hrs`;
    };

    // Navigate to game details
    const openGameDetails = (game: UnifiedGame) => {
        if (game.originalGame) {
            // Custom game from library
            navigateTo('game-details', { game: game.originalGame, platformGame: null });
        } else {
            // Platform game
            navigateTo('game-details', {
                game: null,
                platformGame: {
                    id: game.appId?.toString() || game.id,
                    name: game.name,
                    platform: game.platform,
                    imageUrl: game.imageUrl,
                    playtime: game.playtime,
                    installPath: game.installPath,
                    appId: game.appId,
                    isInstalled: game.isInstalled
                }
            });
        }
    };

    // Handle launching game
    const handleLaunchGame = async (game: UnifiedGame) => {
        if (game.platform === 'steam' && game.appId) {
            const success = await launchSteamGame(game.appId);
            if (success) {
                showGameStarted(game.name);
            } else {
                showError('Error al iniciar', `No se pudo iniciar ${game.name}`);
            }
        } else if (game.installedGame) {
            const success = await launchPlatformGame(game.installedGame.platform, game.installedGame.id);
            if (success) {
                showGameStarted(game.name);
            } else {
                showError('Error al iniciar', `No se pudo iniciar ${game.name}`);
            }
        }
    };

    // Open game directory
    const openGameDirectory = async (path: string) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                await ipcRenderer.invoke('open-game-directory', path);
                showSuccess('Directorio abierto', 'Se ha abierto el directorio del juego');
            }
        } catch {
            showError('Error', 'No se pudo abrir el directorio');
        }
    };

    const handleDeleteGame = async (game: UnifiedGame) => {
        if (!game.originalGame) return;

        openConfirmModal({
            title: 'Eliminar juego',
            message: `¿Estás seguro de que quieres eliminar "${game.name}" de tu biblioteca? Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
            cancelText: 'Cancelar',
            isDanger: true,
            onConfirm: async () => {
                if (game.originalGame) {
                    await deleteGame(game.originalGame.id);
                    showSuccess('Juego eliminado', `${game.name} ha sido eliminado de tu biblioteca`);
                }
            }
        });
    };

    // Context menu for games
    const showContextMenu = (e: React.MouseEvent, game: UnifiedGame) => {
        e.preventDefault();
        e.stopPropagation();

        const items: ContextMenuItem[] = [
            {
                id: 'play',
                label: 'Jugar',
                icon: <Play size={16} />,
                onClick: () => handleLaunchGame(game)
            },
            {
                id: 'details',
                label: 'Ver detalles',
                icon: <ExternalLink size={16} />,
                onClick: () => openGameDetails(game),
                divider: true
            }
        ];

        if (game.installPath) {
            items.push({
                id: 'directory',
                label: 'Abrir directorio',
                icon: <FolderOpen size={16} />,
                onClick: () => openGameDirectory(game.installPath!)
            });
        }

        if (game.originalGame) {
            items.push({
                id: 'delete',
                label: 'Eliminar de biblioteca',
                icon: <Trash2 size={16} />,
                onClick: () => handleDeleteGame(game),
                danger: true,
                divider: true
            });
        }

        setContextMenu({ x: e.clientX, y: e.clientY, items });
    };

    return (
        <div className="library">
            {/* Header */}
            <header className="library-header">
                <div className="header-title">
                    <h1>Biblioteca</h1>
                    <span className="game-count">{allGames.length} juegos</span>
                </div>

                <div className="header-actions">
                    <button
                        className="btn btn-refresh"
                        onClick={() => {
                            detectAllLaunchers();
                            loadLinkedAccounts();
                        }}
                        disabled={isLoadingLaunchers}
                        title="Actualizar bibliotecas"
                    >
                        <RefreshCw size={18} className={isLoadingLaunchers ? 'spinning' : ''} />
                    </button>
                    <button
                        className="btn btn-link-accounts"
                        onClick={() => openModal('link-accounts')}
                    >
                        <Link2 size={18} />
                        Vincular cuentas
                        {(hasLinkedAccounts || hasDetectedLaunchers) && <span className="linked-badge" />}
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

                {/* Platform Chips */}
                <div className="platform-chips">
                    {platformConfig.map(platform => {
                        const count = platformCounts[platform.id] || 0;
                        if (count === 0 && platform.id !== 'steam') return null;

                        return (
                            <button
                                key={platform.id}
                                className={`platform-chip ${selectedPlatform === platform.id ? 'active' : ''}`}
                                onClick={() => setSelectedPlatform(
                                    selectedPlatform === platform.id ? null : platform.id
                                )}
                                style={{
                                    '--platform-color': platform.color
                                } as React.CSSProperties}
                            >
                                {platform.icon}
                                <span>{platform.label}</span>
                                {count > 0 && <span className="chip-count">{count}</span>}
                            </button>
                        );
                    })}
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
                                <h4>Estado</h4>
                                <div className="filter-chips">
                                    {statusFilters.map(sf => (
                                        <button
                                            key={sf.value}
                                            className={`filter-chip ${filters.status.includes(sf.value as any) ? 'active' : ''}`}
                                            onClick={() => {
                                                const current = filters.status;
                                                const updated = current.includes(sf.value as any)
                                                    ? current.filter(s => s !== sf.value)
                                                    : [...current, sf.value as any];
                                                setFilters({ status: updated });
                                            }}
                                        >
                                            {sf.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {hasActiveFilters && (
                                <button className="btn btn-ghost" onClick={() => {
                                    resetFilters();
                                    setSelectedPlatform(null);
                                }}>
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
                        className="unified-games-grid"
                        layout
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredGames.map((game, index) => (
                                <motion.div
                                    key={game.id}
                                    className={`unified-game-card ${game.platform} ${!game.isInstalled ? 'not-installed' : ''}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                    onClick={() => openGameDetails(game)}
                                    onContextMenu={(e) => showContextMenu(e, game)}
                                    style={{
                                        '--hover-color': platformColors[game.platform]?.hover || 'rgba(139, 92, 246, 0.4)'
                                    } as React.CSSProperties}
                                >
                                    <div className="game-image">
                                        {game.imageUrl ? (
                                            <img
                                                src={game.imageUrl}
                                                alt={game.name}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="game-placeholder">
                                                <Gamepad2 size={32} />
                                            </div>
                                        )}
                                        <div className={`game-overlay ${!game.isInstalled ? 'install' : ''}`}>
                                            {game.isInstalled ? (
                                                <Play size={24} />
                                            ) : (
                                                <Download size={24} />
                                            )}
                                        </div>
                                        <div
                                            className="platform-indicator"
                                            style={{
                                                background: platformColors[game.platform]?.bg || 'var(--color-primary)'
                                            }}
                                        >
                                            {platformConfig.find(p => p.id === game.platform)?.icon}
                                        </div>
                                        {!game.isInstalled && (
                                            <div className="not-installed-badge">
                                                No instalado
                                            </div>
                                        )}
                                    </div>
                                    <div className="game-info">
                                        <h4>{game.name}</h4>
                                        {game.playtime !== undefined && game.playtime > 0 && (
                                            <span className="playtime" style={{ color: platformColors[game.platform]?.color }}>
                                                {formatPlaytime(game.playtime)}
                                            </span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">
                            {searchQuery ? <Search size={64} /> : <Gamepad2 size={64} />}
                        </div>
                        <h3>{searchQuery ? 'Sin resultados' : 'Tu biblioteca está vacía'}</h3>
                        <p>
                            {searchQuery
                                ? `No se encontraron juegos que coincidan con "${searchQuery}"`
                                : 'Agrega tu primer juego o vincula tus cuentas de plataformas'
                            }
                        </p>
                        {!searchQuery && (
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
                        )}
                    </div>
                )}
            </div>

            {/* Context Menu */}
            <AnimatePresence>
                {contextMenu && (
                    <GameContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        items={contextMenu.items}
                        onClose={() => setContextMenu(null)}
                    />
                )}
            </AnimatePresence>

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
