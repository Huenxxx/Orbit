import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Link2,
    Unlink,
    RefreshCw,
    CheckCircle2,
    Gamepad2,
    Shield,
    Loader2
} from 'lucide-react';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import { useLaunchersStore, type Platform } from '../../stores/launchersStore';
import { useNotificationStore } from '../../stores/notificationStore';
import './LinkAccountsModal.css';

// Platform Icons as SVG
const SteamIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.936 3.589 9.021 8.305 9.818l2.682-3.837c-.024.001-.048.002-.073.002-1.893 0-3.449-1.476-3.571-3.343L5.246 12.37C5.088 11.591 5 10.803 5 10c0-3.866 3.134-7 7-7s7 3.134 7 7c0 .803-.088 1.591-.246 2.37l-4.839 1.846A3.58 3.58 0 0 0 12 14c-.025 0-.049-.001-.073-.002l2.682 3.837C19.411 21.021 23 16.936 23 12 23 6.477 18.523 2 12 2zm-2.414 12.414a2 2 0 1 1 2.828 2.828 2 2 0 0 1-2.828-2.828zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
);

const EpicIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M3.537 0C2.165 0 1.66.506 1.66 1.879V18.44c0 1.373.505 1.879 1.877 1.879h3.761l.631 3.68 4.07-3.68h8.464c1.373 0 1.878-.506 1.878-1.879V1.879C22.341.506 21.836 0 20.463 0H3.537zm.825 2.104h16.276v15.762H4.362V2.104z" />
    </svg>
);

const GogIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-13h4v2h-4v4h4v2H8V7h2zm6 0h2v8h-2V7z" />
    </svg>
);

const EaIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
);

const UbisoftIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
);

interface LinkAccountsModalProps {
    onClose: () => void;
}

export function LinkAccountsModal({ onClose }: LinkAccountsModalProps) {
    const {
        steamAccount,
        steamGames,
        installedSteamGames,
        isLinkingSteam,
        isSyncingSteam,
        linkSteamAccountAuto,
        unlinkSteamAccount,
        syncSteamGames,
        detectLocalSteam,
        launchSteamGame,
        installSteamGame
    } = useLinkedAccountsStore();

    // Multi-launcher store
    const {
        epicInfo,
        gogInfo,
        eaInfo,
        ubisoftInfo,
        isLoading: isLoadingLaunchers,
        detectAllLaunchers,
        launchGame
    } = useLaunchersStore();

    const { showInfo, showSuccess, showError } = useNotificationStore();

    const [isOpeningSteam, setIsOpeningSteam] = useState(false);

    // Detect local Steam and all launchers on mount
    useEffect(() => {
        detectLocalSteam();
        detectAllLaunchers();
    }, [detectLocalSteam, detectAllLaunchers]);

    // Auto-link Steam using local installation
    const handleSteamLogin = async () => {
        setIsOpeningSteam(true);

        try {
            const success = await linkSteamAccountAuto();

            if (success) {
                showSuccess('¡Steam vinculado!', 'Tu cuenta de Steam ha sido detectada y vinculada correctamente');
            } else {
                showError('Error', 'No se pudo vincular Steam. Asegúrate de tener Steam instalado y haber iniciado sesión.');
            }
        } catch (error) {
            showError('Error', 'Error al vincular la cuenta de Steam');
        } finally {
            setIsOpeningSteam(false);
        }
    };

    // Handle launching a Steam game
    const handleLaunchGame = async (appId: number, gameName: string) => {
        showInfo('Iniciando juego', `Abriendo ${gameName}...`);
        const success = await launchSteamGame(appId);
        if (!success) {
            showError('Error', `No se pudo iniciar ${gameName}`);
        }
    };

    // Handle installing a Steam game
    const handleInstallGame = async (appId: number, gameName: string) => {
        showInfo('Instalando juego', `Abriendo Steam para instalar ${gameName}...`);
        const success = await installSteamGame(appId);
        if (!success) {
            showError('Error', `No se pudo iniciar la instalación de ${gameName}`);
        }
    };

    // Check if a game is installed locally
    const isGameInstalled = (appId: number) => {
        return installedSteamGames.some(g => g.appid === appId);
    };

    // Handle launching a game from any platform
    const handleLaunchMultiPlatform = async (platform: Platform, gameId: string, gameName: string) => {
        showInfo('Iniciando juego', `Abriendo ${gameName}...`);
        const success = await launchGame(platform, gameId);
        if (!success) {
            showError('Error', `No se pudo iniciar ${gameName}`);
        }
    };

    // Refresh all launchers
    const handleRefreshAll = async () => {
        showInfo('Actualizando', 'Detectando launchers y juegos instalados...');
        await detectAllLaunchers();
        await detectLocalSteam();
        showSuccess('Actualizado', 'Se han detectado todos los launchers');
    };

    const formatPlaytime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        if (hours < 1) return `${minutes} min`;
        return `${hours.toLocaleString()} hrs`;
    };

    const formatLastSync = (dateStr?: string) => {
        if (!dateStr) return 'Nunca';
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'Ahora mismo';
        if (minutes < 60) return `Hace ${minutes} min`;
        if (hours < 24) return `Hace ${hours}h`;
        return `Hace ${days} días`;
    };

    return (
        <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="link-accounts-modal"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div className="modal-title">
                        <Link2 size={24} />
                        <h2>Vincular Cuentas</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content">
                    <p className="modal-description">
                        Conecta tus cuentas de plataformas de juegos para ver todos tus juegos en un solo lugar.
                        <br />
                        <span className="browser-note">
                            <SteamIcon />
                            ORBIT detecta automáticamente tu cuenta de Steam y tus juegos instalados.
                        </span>
                    </p>

                    {/* Steam Account Card */}
                    <div className={`platform-card steam ${steamAccount ? 'linked' : ''}`}>
                        <div className="platform-header">
                            <div className="platform-info">
                                <div className="platform-icon steam-icon">
                                    <SteamIcon />
                                </div>
                                <div className="platform-details">
                                    <h3>Steam</h3>
                                    {steamAccount ? (
                                        <span className="linked-status">
                                            <CheckCircle2 size={14} />
                                            Vinculado como {steamAccount.username}
                                        </span>
                                    ) : (
                                        <span className="unlinked-status">No vinculado</span>
                                    )}
                                </div>
                            </div>

                            <div className="platform-actions">
                                {steamAccount ? (
                                    <>
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => syncSteamGames()}
                                            disabled={isSyncingSteam}
                                            title="Sincronizar juegos"
                                        >
                                            <RefreshCw size={16} className={isSyncingSteam ? 'spinning' : ''} />
                                        </button>
                                        <button
                                            className="btn btn-danger-ghost"
                                            onClick={unlinkSteamAccount}
                                            title="Desvincular cuenta"
                                        >
                                            <Unlink size={16} />
                                            Desvincular
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="btn btn-steam"
                                        onClick={handleSteamLogin}
                                        disabled={isLinkingSteam || isOpeningSteam}
                                    >
                                        {isOpeningSteam || isLinkingSteam ? (
                                            <>
                                                <Loader2 size={16} className="spinning" />
                                                Detectando Steam...
                                            </>
                                        ) : (
                                            <>
                                                <SteamIcon />
                                                Vincular Steam
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Steam Games Preview */}
                        {steamAccount && steamGames.length > 0 && (
                            <div className="games-preview">
                                <div className="games-preview-header">
                                    <span className="games-count">
                                        <Gamepad2 size={14} />
                                        {steamGames.length} juegos
                                        {installedSteamGames.length > 0 && (
                                            <span className="installed-count">
                                                ({installedSteamGames.length} instalados)
                                            </span>
                                        )}
                                    </span>
                                    <span className="last-sync">
                                        Última sincronización: {formatLastSync(steamAccount.lastSync)}
                                    </span>
                                </div>
                                <div className="games-list">
                                    {steamGames.slice(0, 4).map((game) => {
                                        const installed = isGameInstalled(game.appid);
                                        return (
                                            <div key={game.appid} className={`game-preview-item ${installed ? 'installed' : ''}`}>
                                                <img
                                                    src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`}
                                                    alt={game.name}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/460x215?text=No+Image';
                                                    }}
                                                />
                                                <div className="game-preview-info">
                                                    <span className="game-name">{game.name}</span>
                                                    <span className="game-playtime">{formatPlaytime(game.playtime_forever)}</span>
                                                </div>
                                                <button
                                                    className={`btn-game-action ${installed ? 'btn-play' : 'btn-install'}`}
                                                    onClick={() => installed
                                                        ? handleLaunchGame(game.appid, game.name)
                                                        : handleInstallGame(game.appid, game.name)
                                                    }
                                                    title={installed ? 'Jugar' : 'Instalar'}
                                                >
                                                    {installed ? '▶' : '↓'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {steamGames.length > 4 && (
                                        <div className="more-games">
                                            +{steamGames.length - 4} más
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Epic Games Card - Local Detection */}
                    <div className={`platform-card epic ${epicInfo?.installed ? 'linked' : ''}`}>
                        <div className="platform-header">
                            <div className="platform-info">
                                <div className="platform-icon epic-icon">
                                    <EpicIcon />
                                </div>
                                <div className="platform-details">
                                    <h3>Epic Games</h3>
                                    {epicInfo?.installed ? (
                                        <span className="linked-status">
                                            <CheckCircle2 size={14} />
                                            {epicInfo.gameCount} juegos detectados
                                        </span>
                                    ) : (
                                        <span className="unlinked-status">No detectado</span>
                                    )}
                                </div>
                            </div>

                            <div className="platform-actions">
                                <button
                                    className="btn btn-icon"
                                    onClick={handleRefreshAll}
                                    disabled={isLoadingLaunchers}
                                    title="Detectar juegos"
                                >
                                    <RefreshCw size={16} className={isLoadingLaunchers ? 'spinning' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Epic Games Preview */}
                        {epicInfo?.games && epicInfo.games.length > 0 && (
                            <div className="games-preview">
                                <div className="games-preview-header">
                                    <span className="games-count">
                                        <Gamepad2 size={14} />
                                        {epicInfo.gameCount} juegos instalados
                                    </span>
                                </div>
                                <div className="games-list">
                                    {epicInfo.games.slice(0, 4).map((game) => (
                                        <div key={game.id} className="game-preview-item installed">
                                            <div className="epic-game-placeholder">
                                                <Gamepad2 size={20} />
                                            </div>
                                            <div className="game-preview-info">
                                                <span className="game-name">{game.name}</span>
                                            </div>
                                            <button
                                                className="btn-game-action btn-play"
                                                onClick={() => handleLaunchMultiPlatform('epic', game.id, game.name)}
                                                title="Jugar"
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    ))}
                                    {epicInfo.gameCount > 4 && (
                                        <div className="more-games">
                                            +{epicInfo.gameCount - 4} más
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* GOG Galaxy Card */}
                    <div className={`platform-card gog ${gogInfo?.installed ? 'linked' : ''}`}>
                        <div className="platform-header">
                            <div className="platform-info">
                                <div className="platform-icon gog-icon">
                                    <GogIcon />
                                </div>
                                <div className="platform-details">
                                    <h3>GOG Galaxy</h3>
                                    {gogInfo?.installed ? (
                                        <span className="linked-status">
                                            <CheckCircle2 size={14} />
                                            {gogInfo.gameCount} juegos detectados
                                        </span>
                                    ) : (
                                        <span className="unlinked-status">No detectado</span>
                                    )}
                                </div>
                            </div>

                            <div className="platform-actions">
                                <button
                                    className="btn btn-icon"
                                    onClick={handleRefreshAll}
                                    disabled={isLoadingLaunchers}
                                    title="Detectar juegos"
                                >
                                    <RefreshCw size={16} className={isLoadingLaunchers ? 'spinning' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* GOG Games Preview */}
                        {gogInfo?.games && gogInfo.games.length > 0 && (
                            <div className="games-preview">
                                <div className="games-list">
                                    {gogInfo.games.slice(0, 4).map((game) => (
                                        <div key={game.id} className="game-preview-item installed">
                                            <div className="gog-game-placeholder">
                                                <Gamepad2 size={20} />
                                            </div>
                                            <div className="game-preview-info">
                                                <span className="game-name">{game.name}</span>
                                            </div>
                                            <button
                                                className="btn-game-action btn-play"
                                                onClick={() => handleLaunchMultiPlatform('gog', game.id, game.name)}
                                                title="Jugar"
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EA App Card */}
                    <div className={`platform-card ea ${eaInfo?.installed ? 'linked' : ''}`}>
                        <div className="platform-header">
                            <div className="platform-info">
                                <div className="platform-icon ea-icon">
                                    <EaIcon />
                                </div>
                                <div className="platform-details">
                                    <h3>EA App</h3>
                                    {eaInfo?.installed ? (
                                        <span className="linked-status">
                                            <CheckCircle2 size={14} />
                                            {eaInfo.gameCount} juegos detectados
                                        </span>
                                    ) : (
                                        <span className="unlinked-status">No detectado</span>
                                    )}
                                </div>
                            </div>

                            <div className="platform-actions">
                                <button
                                    className="btn btn-icon"
                                    onClick={handleRefreshAll}
                                    disabled={isLoadingLaunchers}
                                    title="Detectar juegos"
                                >
                                    <RefreshCw size={16} className={isLoadingLaunchers ? 'spinning' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* EA Games Preview */}
                        {eaInfo?.games && eaInfo.games.length > 0 && (
                            <div className="games-preview">
                                <div className="games-list">
                                    {eaInfo.games.slice(0, 4).map((game) => (
                                        <div key={game.id} className="game-preview-item installed">
                                            <div className="ea-game-placeholder">
                                                <Gamepad2 size={20} />
                                            </div>
                                            <div className="game-preview-info">
                                                <span className="game-name">{game.name}</span>
                                            </div>
                                            <button
                                                className="btn-game-action btn-play"
                                                onClick={() => handleLaunchMultiPlatform('ea', game.id, game.name)}
                                                title="Jugar"
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Ubisoft Connect Card */}
                    <div className={`platform-card ubisoft ${ubisoftInfo?.installed ? 'linked' : ''}`}>
                        <div className="platform-header">
                            <div className="platform-info">
                                <div className="platform-icon ubisoft-icon">
                                    <UbisoftIcon />
                                </div>
                                <div className="platform-details">
                                    <h3>Ubisoft Connect</h3>
                                    {ubisoftInfo?.installed ? (
                                        <span className="linked-status">
                                            <CheckCircle2 size={14} />
                                            {ubisoftInfo.gameCount} juegos detectados
                                        </span>
                                    ) : (
                                        <span className="unlinked-status">No detectado</span>
                                    )}
                                </div>
                            </div>

                            <div className="platform-actions">
                                <button
                                    className="btn btn-icon"
                                    onClick={handleRefreshAll}
                                    disabled={isLoadingLaunchers}
                                    title="Detectar juegos"
                                >
                                    <RefreshCw size={16} className={isLoadingLaunchers ? 'spinning' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Ubisoft Games Preview */}
                        {ubisoftInfo?.games && ubisoftInfo.games.length > 0 && (
                            <div className="games-preview">
                                <div className="games-list">
                                    {ubisoftInfo.games.slice(0, 4).map((game) => (
                                        <div key={game.id} className="game-preview-item installed">
                                            <div className="ubisoft-game-placeholder">
                                                <Gamepad2 size={20} />
                                            </div>
                                            <div className="game-preview-info">
                                                <span className="game-name">{game.name}</span>
                                            </div>
                                            <button
                                                className="btn-game-action btn-play"
                                                onClick={() => handleLaunchMultiPlatform('ubisoft', game.id, game.name)}
                                                title="Jugar"
                                            >
                                                ▶
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info Note */}
                    <div className="info-note">
                        <Shield size={16} />
                        <p>
                            ORBIT detecta automáticamente los launchers instalados en tu PC y los juegos disponibles.
                            Haz clic en el botón de actualizar para detectar nuevos juegos.
                        </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
