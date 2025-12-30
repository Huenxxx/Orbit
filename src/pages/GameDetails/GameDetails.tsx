import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Play,
    Clock,
    Calendar,
    Star,
    FolderOpen,
    ExternalLink,
    Download,
    Cloud,
    Gamepad2,
    MoreHorizontal,
    Edit,
    Trash2,
    Search,
    Loader2,
    X,
    AlertCircle
} from 'lucide-react';
import { useUIStore, useGamesStore } from '../../stores';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import { useLaunchersStore } from '../../stores/launchersStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useDownloadsStore, type RepackSource } from '../../stores/downloadsStore';
import type { Game } from '../../types';
import { SteamAchievements } from '../../components/SteamAchievements/SteamAchievements';
import { SteamFriends } from '../../components/SteamFriends/SteamFriends';
import { ipc } from '../../services/ipc';
import './GameDetails.css';



interface GameDetailsData {
    game: Game | null;
    platformGame: {
        id: string;
        name: string;
        platform: 'steam' | 'epic' | 'gog' | 'ea' | 'ubisoft';
        imageUrl?: string;
        playtime?: number;
        installPath?: string;
        executable?: string;
        appId?: number;
        isInstalled?: boolean;
    } | null;
}

export function GameDetails() {
    const { navigateTo, gameDetailsData } = useUIStore();
    const { deleteGame, updateGame } = useGamesStore();
    const { launchSteamGame, steamAccount } = useLinkedAccountsStore();
    const { launchGame: launchPlatformGame } = useLaunchersStore();
    const { showGameStarted, showError, showSuccess } = useNotificationStore();
    const { searchRepacks, addDownload } = useDownloadsStore();

    const [showMenu, setShowMenu] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);

    // Repack search states
    const [showRepackModal, setShowRepackModal] = useState(false);
    const [repackResults, setRepackResults] = useState<RepackSource[]>([]);
    const [isSearchingRepacks, setIsSearchingRepacks] = useState(false);
    const [repackSearchDone, setRepackSearchDone] = useState(false);

    // Steam specific states
    const [playerCount, setPlayerCount] = useState<number | null>(null);
    const [reviews, setReviews] = useState<{
        scoreDescription: string;
        percentage: number;
        total: number;
    } | null>(null);

    // Get game data based on what was passed
    const data = gameDetailsData as GameDetailsData | null;
    const game = data?.game;
    const platformGame = data?.platformGame;

    // If no game data, go back to library
    useEffect(() => {
        if (!game && !platformGame) {
            navigateTo('library');
        }
    }, [game, platformGame, navigateTo]);

    // Fetch player count and reviews for Steam games
    useEffect(() => {
        const fetchSteamData = async () => {
            const steamAppId = platformGame?.platform === 'steam' ? platformGame.appId : undefined;
            if (!steamAppId) return;

            try {
                // Fetch Player Count
                const countResult = await ipc.invoke<{ success: boolean; playerCount: number }>('steam-get-player-count', steamAppId);
                if (countResult && countResult.success) {
                    setPlayerCount(countResult.playerCount);
                }

                // Fetch Reviews
                const reviewResult = await ipc.invoke<{
                    success: boolean;
                    reviews: { scoreDescription: string; percentage: number; total: number }
                }>('steam-get-reviews', steamAppId);

                if (reviewResult && reviewResult.success && reviewResult.reviews) {
                    setReviews(reviewResult.reviews);
                }

            } catch (error) {
                console.error('Error fetching steam data:', error);
            }
        };

        fetchSteamData();
        const interval = setInterval(fetchSteamData, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [platformGame]);

    if (!game && !platformGame) {
        return null;
    }

    const getPlatformColor = (platform: string) => {
        const colors: Record<string, { bg: string; accent: string; gradient: string }> = {
            steam: {
                bg: 'linear-gradient(135deg, #1b2838, #2a475e)',
                accent: '#66c0f4',
                gradient: 'linear-gradient(135deg, rgba(102, 192, 244, 0.15), rgba(27, 40, 56, 0.8))'
            },
            epic: {
                bg: 'linear-gradient(135deg, #121212, #2a2a2a)',
                accent: '#ffffff',
                gradient: 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(18, 18, 18, 0.8))'
            },
            gog: {
                bg: 'linear-gradient(135deg, #5c2d91, #86328a)',
                accent: '#ffffff',
                gradient: 'linear-gradient(135deg, rgba(134, 50, 138, 0.15), rgba(92, 45, 145, 0.8))'
            },
            ea: {
                bg: 'linear-gradient(135deg, #ff4747, #e94040)',
                accent: '#ffffff',
                gradient: 'linear-gradient(135deg, rgba(255, 71, 71, 0.15), rgba(233, 64, 64, 0.8))'
            },
            ubisoft: {
                bg: 'linear-gradient(135deg, #0070ff, #003dad)',
                accent: '#ffffff',
                gradient: 'linear-gradient(135deg, rgba(0, 112, 255, 0.15), rgba(0, 61, 173, 0.8))'
            },
            custom: {
                bg: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                accent: 'var(--color-primary-light)',
                gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(20, 184, 166, 0.15))'
            }
        };
        return colors[platform] || colors.custom;
    };

    const getPlatformLabel = (platform: string) => {
        const labels: Record<string, string> = {
            steam: 'Steam',
            epic: 'Epic Games',
            gog: 'GOG Galaxy',
            ea: 'EA App',
            ubisoft: 'Ubisoft Connect',
            custom: 'Mi Biblioteca'
        };
        return labels[platform] || platform;
    };

    const formatPlaytime = (minutes: number) => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const handlePlay = async () => {
        setIsLaunching(true);
        try {
            if (platformGame) {
                if (platformGame.platform === 'steam' && platformGame.appId) {
                    const success = await launchSteamGame(platformGame.appId);
                    if (success) {
                        showGameStarted(platformGame.name);
                    } else {
                        showError('Error al iniciar', `No se pudo iniciar ${platformGame.name}`);
                    }
                } else {
                    const success = await launchPlatformGame(platformGame.platform, platformGame.id);
                    if (success) {
                        showGameStarted(platformGame.name);
                    } else {
                        showError('Error al iniciar', `No se pudo iniciar ${platformGame.name}`);
                    }
                }
            } else if (game) {
                // Launch custom game
                if (game.executablePath) {
                    await ipc.invoke('launch-game', game.executablePath);
                    showGameStarted(game.title);
                    // Update last played
                    updateGame(game.id, { lastPlayed: new Date().toISOString() });
                } else {
                    showError('Error', 'No se ha configurado un ejecutable para este juego');
                }
            }
        } catch (error) {
            showError('Error', 'No se pudo iniciar el juego');
        } finally {
            setIsLaunching(false);
        }
    };

    const handleOpenDirectory = async () => {
        const path = platformGame?.installPath || game?.installPath;
        if (!path) return;

        try {
            await ipc.invoke('open-game-directory', path);
        } catch (error) {
            showError('Error', 'No se pudo abrir el directorio');
        }
    };

    const handleOpenStore = async () => {
        if (platformGame?.platform === 'steam' && platformGame.appId) {
            try {
                await ipc.invoke('steam-open-store', platformGame.appId);
            } catch (error) {
                showError('Error', 'No se pudo abrir la tienda');
            }
        }
    };

    const handleDelete = async () => {
        if (game) {
            await deleteGame(game.id);
            showSuccess('Eliminado', `${game.title} ha sido eliminado de tu biblioteca`);
            navigateTo('library');
        }
    };

    const handleEdit = () => {
        if (game) {
            useGamesStore.getState().setSelectedGame(game);
            useUIStore.getState().openModal('edit-game');
        }
    };

    // Repack search functions
    const openRepackSearch = async () => {
        const gameName = platformGame?.name || game?.title;
        if (!gameName) return;

        setShowRepackModal(true);
        setIsSearchingRepacks(true);
        setRepackSearchDone(false);

        try {
            const results = await searchRepacks(gameName);
            setRepackResults(results);
            setRepackSearchDone(true);
        } catch (error) {
            console.error('Error searching repacks:', error);
            setRepackResults([]);
            setRepackSearchDone(true);
        } finally {
            setIsSearchingRepacks(false);
        }
    };

    const handleRepackSelect = async (repack: RepackSource) => {
        try {
            let magnetUri = repack.magnetUri;

            // If no magnet URI, fetch it from the post URL
            if (!magnetUri && repack.postUrl && repack.source) {
                showSuccess('Obteniendo enlace', 'Obteniendo enlace magnet...');

                const result = await ipc.invoke<{ success: boolean; magnet?: string }>('repacks-get-magnet', {
                    source: repack.source,
                    postUrl: repack.postUrl
                });

                if (result && result.success && result.magnet) {
                    magnetUri = result.magnet;
                } else {
                    showError('Error', 'No se pudo obtener el enlace magnet. Intenta con otro repack.');
                    return;
                }
            }

            if (!magnetUri) {
                showError('Error', 'No se encontró enlace magnet');
                return;
            }

            await addDownload(repack.name, magnetUri);
            showSuccess('Descarga añadida', `${repack.name} ha sido añadido a la cola`);
            setShowRepackModal(false);
            navigateTo('downloads');
        } catch {
            showError('Error', 'No se pudo añadir la descarga');
        }
    };

    // Determine which data to use
    const title = platformGame?.name || game?.title || 'Juego';
    const coverImage = platformGame?.imageUrl || game?.coverImage;
    const platform = platformGame?.platform || game?.platform || 'custom';
    const playtime = platformGame?.playtime || game?.playtime || 0;
    const installPath = platformGame?.installPath || game?.installPath;
    const steamAppId = platformGame?.platform === 'steam' ? platformGame.appId : undefined;

    // Determine if installed
    const isInstalled = platformGame?.isInstalled !== undefined
        ? platformGame.isInstalled
        : (game?.isInstalled || !!game?.executablePath || !!installPath);

    const platformStyle = getPlatformColor(platform);

    return (
        <div className="game-details-page">
            {/* Hero Header */}
            <div
                className="game-hero"
                style={{
                    backgroundImage: coverImage ? `url(${coverImage})` : undefined
                }}
            >
                <div className="hero-gradient" />
                <div className="hero-content">
                    {/* Back button */}
                    <button
                        className="btn-back"
                        onClick={() => navigateTo('library')}
                    >
                        <ArrowLeft size={20} />
                        <span>{title}</span>
                    </button>

                    {/* Game Logo Area */}
                    <div className="game-logo-area">
                        {coverImage ? (
                            <img
                                src={coverImage}
                                alt={title}
                                className="game-logo"
                            />
                        ) : (
                            <div className="game-logo-placeholder">
                                <Gamepad2 size={64} />
                            </div>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="hero-actions">
                        <span className="cloud-status">
                            <Cloud size={16} />
                            Guardado en la nube
                        </span>
                        <button
                            className="btn-add-library"
                            style={{ background: platformStyle.bg }}
                        >
                            <Download size={16} />
                            Añadir a la librería
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="game-content">
                <div className="content-main">
                    {/* Game Info Header */}
                    <div className="game-info-header">
                        <div className="game-title-section">
                            <span
                                className="platform-badge"
                                style={{ background: platformStyle.bg, color: platformStyle.accent }}
                            >
                                {getPlatformLabel(platform)}
                            </span>
                            {game?.releaseDate && (
                                <div className="release-info">
                                    <Calendar size={14} />
                                    <span>Lanzado el {new Date(game.releaseDate).toLocaleDateString('es', {
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric'
                                    })}</span>
                                </div>
                            )}
                            {game?.developer && (
                                <div className="developer-info">
                                    Publicado por {game.developer}
                                </div>
                            )}
                        </div>

                        {/* Play Button & Actions */}
                        <div className="game-actions">
                            {!isInstalled && (
                                <div className="not-available">
                                    Este juego no está instalado
                                </div>
                            )}
                            <button
                                className={`btn-play-main ${!isInstalled ? 'install' : ''}`}
                                onClick={isInstalled ? handlePlay : openRepackSearch}
                                disabled={isLaunching}
                                style={{ background: isInstalled ? platformStyle.bg : 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                            >
                                {isInstalled ? (
                                    <>
                                        <Play size={22} fill="currentColor" />
                                        {isLaunching ? 'INICIANDO...' : 'JUGAR'}
                                    </>
                                ) : (
                                    <>
                                        <Search size={22} />
                                        BUSCAR REPACKS
                                    </>
                                )}
                            </button>
                            <div className="secondary-actions">
                                {installPath && (
                                    <button
                                        className="btn-action"
                                        onClick={handleOpenDirectory}
                                        title="Abrir directorio"
                                    >
                                        <FolderOpen size={18} />
                                    </button>
                                )}
                                {platformGame?.platform === 'steam' && platformGame.appId && (
                                    <button
                                        className="btn-action"
                                        onClick={handleOpenStore}
                                        title="Ver en tienda"
                                    >
                                        <ExternalLink size={18} />
                                    </button>
                                )}
                                {game && (
                                    <div className="menu-container">
                                        <button
                                            className="btn-action"
                                            onClick={() => setShowMenu(!showMenu)}
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                        {showMenu && (
                                            <div className="dropdown-menu">
                                                <button onClick={handleEdit}>
                                                    <Edit size={16} />
                                                    Editar juego
                                                </button>
                                                <button onClick={handleDelete} className="danger">
                                                    <Trash2 size={16} />
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Playtime & Stats */}
                    {playtime > 0 && (
                        <div className="playtime-display">
                            <Clock size={18} />
                            <span>{formatPlaytime(playtime)} jugados</span>
                        </div>
                    )}

                    {/* Description */}
                    {game?.description && (
                        <div className="game-description">
                            <p>{game.description}</p>
                        </div>
                    )}

                    {/* Media Section - Placeholder for screenshots/videos */}
                    <div className="media-section">
                        <div className="media-placeholder">
                            <p>Multimedia del juego</p>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <aside className="content-sidebar">
                    {/* Steam Achievements */}
                    {(platform === 'steam' && steamAppId) && (
                        <div className="sidebar-section">
                            <SteamAchievements
                                steamAppId={steamAppId}
                                steamId={steamAccount?.userId}
                                gameName={title}
                            />
                        </div>
                    )}

                    {/* Steam Friends */}
                    {(platform === 'steam' && steamAppId) && (
                        <SteamFriends
                            appId={steamAppId}
                            steamId={steamAccount?.userId}
                        />
                    )}

                    {/* Stats */}
                    <div className="sidebar-section">
                        <div className="section-header">
                            <Star size={18} />
                            <h3>Estadísticas</h3>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-item">
                                <Download size={14} />
                                <span className="stat-label">Descargas</span>
                                <span className="stat-value">-</span>
                            </div>
                            <div className="stat-item">
                                <Gamepad2 size={14} />
                                <span className="stat-label">Jugadores activos</span>
                                <span className="stat-value">
                                    {playerCount !== null ? playerCount.toLocaleString() : '-'}
                                </span>
                            </div>
                            {game?.rating && (
                                <div className="stat-item">
                                    <Star size={14} />
                                    <span className="stat-label">Calificación</span>
                                    <span className="stat-value">{game.rating.toFixed(1)}</span>
                                </div>
                            )}
                            {reviews && (
                                <div className="stat-item" style={{ gridColumn: 'span 2' }}>
                                    <Star size={14} />
                                    <span className="stat-label">Reseñas de Steam</span>
                                    <span
                                        className="stat-value"
                                        style={{ fontSize: '0.85rem', color: reviews.percentage > 70 ? '#66c0f4' : '#ccc' }}
                                    >
                                        {reviews.scoreDescription} ({reviews.percentage}%)
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HowLongToBeat - Placeholder */}
                    <div className="sidebar-section">
                        <div className="section-header">
                            <Clock size={18} />
                            <h3>HowLongToBeat</h3>
                        </div>
                        <div className="hltb-stats">
                            <div className="hltb-item">
                                <span className="hltb-label">Historia</span>
                                <span className="hltb-value">-</span>
                            </div>
                            <div className="hltb-item">
                                <span className="hltb-label">Completionista</span>
                                <span className="hltb-value">-</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Repack Search Modal */}
            <AnimatePresence>
                {showRepackModal && (
                    <motion.div
                        className="repack-modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowRepackModal(false)}
                    >
                        <motion.div
                            className="repack-modal"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="repack-modal-header">
                                <h2>
                                    <Download size={20} />
                                    Repacks disponibles
                                </h2>
                                <p>Buscando: "{platformGame?.name || game?.title}"</p>
                                <button className="modal-close" onClick={() => setShowRepackModal(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="repack-modal-content">
                                {isSearchingRepacks ? (
                                    <div className="repack-loading">
                                        <Loader2 size={32} className="spinning" />
                                        <p>Buscando repacks en FitGirl, DODI y ElAmigos...</p>
                                    </div>
                                ) : repackResults.length > 0 ? (
                                    <div className="repack-list">
                                        {repackResults.map(repack => (
                                            <div key={repack.id} className="repack-item">
                                                <div className="repack-info">
                                                    <h4>{repack.name}</h4>
                                                    <div className="repack-meta">
                                                        <span className="repack-size">{repack.size}</span>
                                                        {repack.source && (
                                                            <span className={`source-badge ${repack.source.toLowerCase().replace(' ', '-')}`}>
                                                                {repack.source}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleRepackSelect(repack)}
                                                >
                                                    <Download size={16} />
                                                    Descargar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : repackSearchDone ? (
                                    <div className="repack-empty">
                                        <AlertCircle size={32} />
                                        <p>No se encontraron repacks para este juego</p>
                                        <span>Intenta buscar manualmente en la página de Descargas</span>
                                    </div>
                                ) : null}
                            </div>

                            <div className="repack-modal-footer">
                                <div className="disclaimer">
                                    <AlertCircle size={14} />
                                    <span>Los repacks son distribuidos por terceros. Descarga bajo tu propia responsabilidad.</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
