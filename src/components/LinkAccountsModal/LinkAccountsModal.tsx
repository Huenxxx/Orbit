import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Link2,
    Unlink,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Gamepad2,
    ArrowLeft,
    Shield,
    Loader2,
    ExternalLink
} from 'lucide-react';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import './LinkAccountsModal.css';

// Steam and Epic icons as SVG
const SteamIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.936 3.589 9.021 8.305 9.818l2.682-3.837c-.024.001-.048.002-.073.002-1.893 0-3.449-1.476-3.571-3.343L5.246 12.37C5.088 11.591 5 10.803 5 10c0-3.866 3.134-7 7-7s7 3.134 7 7c0 .803-.088 1.591-.246 2.37l-4.839 1.846A3.58 3.58 0 0 0 12 14c-.025 0-.049-.001-.073-.002l2.682 3.837C19.411 21.021 23 16.936 23 12 23 6.477 18.523 2 12 2zm-2.414 12.414a2 2 0 1 1 2.828 2.828 2 2 0 0 1-2.828-2.828zM12 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </svg>
);

const EpicIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M3 2v20h18V2H3zm15 17H6V5h12v14zM8 7v10h2V7H8zm4 0v10h2V7h-2zm4 0v10h2V7h-2z" />
    </svg>
);

type AuthScreen = 'main' | 'steam-auth' | 'epic-auth';

interface LinkAccountsModalProps {
    onClose: () => void;
}

export function LinkAccountsModal({ onClose }: LinkAccountsModalProps) {
    const {
        steamAccount,
        epicAccount,
        steamGames,
        epicGames,
        isLinkingSteam,
        isLinkingEpic,
        isSyncingSteam,
        isSyncingEpic,
        linkSteamAccount,
        linkEpicAccount,
        unlinkSteamAccount,
        unlinkEpicAccount,
        syncSteamGames,
        syncEpicGames
    } = useLinkedAccountsStore();

    const [currentScreen, setCurrentScreen] = useState<AuthScreen>('main');
    const [steamUsername, setSteamUsername] = useState('');
    const [steamPassword, setSteamPassword] = useState('');
    const [epicEmail, setEpicEmail] = useState('');
    const [epicPassword, setEpicPassword] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const handleSteamAuth = async () => {
        if (!steamUsername.trim() || !steamPassword.trim()) {
            setAuthError('Por favor completa todos los campos');
            return;
        }

        setAuthError(null);
        setIsAuthenticating(true);

        // Simulate OAuth flow
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock successful authentication
        const mockSteamId = '76561198' + Math.floor(Math.random() * 100000000).toString().padStart(9, '0');
        const success = await linkSteamAccount(mockSteamId);

        setIsAuthenticating(false);

        if (success) {
            setSteamUsername('');
            setSteamPassword('');
            setCurrentScreen('main');
        }
    };

    const handleEpicAuth = async () => {
        if (!epicEmail.trim() || !epicPassword.trim()) {
            setAuthError('Por favor completa todos los campos');
            return;
        }

        setAuthError(null);
        setIsAuthenticating(true);

        // Simulate OAuth flow
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock successful authentication
        const success = await linkEpicAccount();

        setIsAuthenticating(false);

        if (success) {
            setEpicEmail('');
            setEpicPassword('');
            setCurrentScreen('main');
        }
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

    const goBack = () => {
        setCurrentScreen('main');
        setAuthError(null);
        setSteamUsername('');
        setSteamPassword('');
        setEpicEmail('');
        setEpicPassword('');
    };

    // Steam Auth Screen
    const renderSteamAuth = () => (
        <motion.div
            className="oauth-screen steam-oauth"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
        >
            <div className="oauth-header">
                <button className="btn-back" onClick={goBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className="oauth-brand steam-brand">
                    <SteamIcon />
                    <span>Steam</span>
                </div>
            </div>

            <div className="oauth-content">
                <div className="oauth-logo steam-logo">
                    <SteamIcon />
                </div>
                <h2>Iniciar sesión en Steam</h2>
                <p>Inicia sesión con tu cuenta de Steam para vincularla a ORBIT</p>

                <AnimatePresence>
                    {authError && (
                        <motion.div
                            className="oauth-error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <AlertCircle size={16} />
                            {authError}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="oauth-form">
                    <div className="oauth-input-group">
                        <label>Nombre de cuenta de Steam</label>
                        <input
                            type="text"
                            placeholder="Tu nombre de cuenta"
                            value={steamUsername}
                            onChange={(e) => setSteamUsername(e.target.value)}
                            disabled={isAuthenticating}
                        />
                    </div>

                    <div className="oauth-input-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={steamPassword}
                            onChange={(e) => setSteamPassword(e.target.value)}
                            disabled={isAuthenticating}
                        />
                    </div>

                    <button
                        className="btn btn-steam-auth"
                        onClick={handleSteamAuth}
                        disabled={isAuthenticating}
                    >
                        {isAuthenticating ? (
                            <>
                                <Loader2 size={18} className="spinning" />
                                Conectando...
                            </>
                        ) : (
                            <>
                                <Shield size={18} />
                                Autorizar acceso
                            </>
                        )}
                    </button>
                </div>

                <div className="oauth-info">
                    <Shield size={14} />
                    <span>ORBIT solo tendrá acceso a tu lista de juegos pública</span>
                </div>

                <div className="oauth-footer">
                    <p>
                        Al continuar, autorizas a ORBIT a acceder a tu biblioteca de Steam.
                    </p>
                    <a href="https://store.steampowered.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={12} /> Ir a Steam
                    </a>
                </div>
            </div>
        </motion.div>
    );

    // Epic Auth Screen
    const renderEpicAuth = () => (
        <motion.div
            className="oauth-screen epic-oauth"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
        >
            <div className="oauth-header">
                <button className="btn-back" onClick={goBack}>
                    <ArrowLeft size={20} />
                </button>
                <div className="oauth-brand epic-brand">
                    <EpicIcon />
                    <span>Epic Games</span>
                </div>
            </div>

            <div className="oauth-content">
                <div className="oauth-logo epic-logo">
                    <EpicIcon />
                </div>
                <h2>Iniciar sesión en Epic Games</h2>
                <p>Vincula tu cuenta de Epic Games para importar tu biblioteca</p>

                <AnimatePresence>
                    {authError && (
                        <motion.div
                            className="oauth-error"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                        >
                            <AlertCircle size={16} />
                            {authError}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="oauth-form">
                    <div className="oauth-input-group">
                        <label>Correo electrónico</label>
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            value={epicEmail}
                            onChange={(e) => setEpicEmail(e.target.value)}
                            disabled={isAuthenticating}
                        />
                    </div>

                    <div className="oauth-input-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={epicPassword}
                            onChange={(e) => setEpicPassword(e.target.value)}
                            disabled={isAuthenticating}
                        />
                    </div>

                    <button
                        className="btn btn-epic-auth"
                        onClick={handleEpicAuth}
                        disabled={isAuthenticating}
                    >
                        {isAuthenticating ? (
                            <>
                                <Loader2 size={18} className="spinning" />
                                Conectando...
                            </>
                        ) : (
                            <>
                                <Shield size={18} />
                                Autorizar acceso
                            </>
                        )}
                    </button>
                </div>

                <div className="oauth-info">
                    <Shield size={14} />
                    <span>ORBIT solo tendrá acceso a tu lista de juegos</span>
                </div>

                <div className="oauth-footer">
                    <p>
                        Al continuar, autorizas a ORBIT a acceder a tu biblioteca de Epic Games.
                    </p>
                    <a href="https://www.epicgames.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={12} /> Ir a Epic Games
                    </a>
                </div>
            </div>
        </motion.div>
    );

    // Main Screen
    const renderMainScreen = () => (
        <motion.div
            className="main-screen"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
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
                                    onClick={() => setCurrentScreen('steam-auth')}
                                    disabled={isLinkingSteam}
                                >
                                    <ExternalLink size={16} />
                                    Iniciar sesión
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
                                </span>
                                <span className="last-sync">
                                    Última sincronización: {formatLastSync(steamAccount.lastSync)}
                                </span>
                            </div>
                            <div className="games-list">
                                {steamGames.slice(0, 4).map((game) => (
                                    <div key={game.appid} className="game-preview-item">
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
                                    </div>
                                ))}
                                {steamGames.length > 4 && (
                                    <div className="more-games">
                                        +{steamGames.length - 4} más
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Epic Games Account Card */}
                <div className={`platform-card epic ${epicAccount ? 'linked' : ''}`}>
                    <div className="platform-header">
                        <div className="platform-info">
                            <div className="platform-icon epic-icon">
                                <EpicIcon />
                            </div>
                            <div className="platform-details">
                                <h3>Epic Games</h3>
                                {epicAccount ? (
                                    <span className="linked-status">
                                        <CheckCircle2 size={14} />
                                        Vinculado como {epicAccount.username}
                                    </span>
                                ) : (
                                    <span className="unlinked-status">No vinculado</span>
                                )}
                            </div>
                        </div>

                        <div className="platform-actions">
                            {epicAccount ? (
                                <>
                                    <button
                                        className="btn btn-icon"
                                        onClick={() => syncEpicGames()}
                                        disabled={isSyncingEpic}
                                        title="Sincronizar juegos"
                                    >
                                        <RefreshCw size={16} className={isSyncingEpic ? 'spinning' : ''} />
                                    </button>
                                    <button
                                        className="btn btn-danger-ghost"
                                        onClick={unlinkEpicAccount}
                                        title="Desvincular cuenta"
                                    >
                                        <Unlink size={16} />
                                        Desvincular
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="btn btn-epic"
                                    onClick={() => setCurrentScreen('epic-auth')}
                                    disabled={isLinkingEpic}
                                >
                                    <ExternalLink size={16} />
                                    Iniciar sesión
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Epic Games Preview */}
                    {epicAccount && epicGames.length > 0 && (
                        <div className="games-preview">
                            <div className="games-preview-header">
                                <span className="games-count">
                                    <Gamepad2 size={14} />
                                    {epicGames.length} juegos
                                </span>
                                <span className="last-sync">
                                    Última sincronización: {formatLastSync(epicAccount.lastSync)}
                                </span>
                            </div>
                            <div className="games-list epic-games-list">
                                {epicGames.slice(0, 4).map((game) => (
                                    <div key={game.id} className="game-preview-item epic-game">
                                        <div className="epic-game-placeholder">
                                            <Gamepad2 size={20} />
                                        </div>
                                        <div className="game-preview-info">
                                            <span className="game-name">{game.title}</span>
                                        </div>
                                    </div>
                                ))}
                                {epicGames.length > 4 && (
                                    <div className="more-games">
                                        +{epicGames.length - 4} más
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Note */}
                <div className="info-note">
                    <Shield size={16} />
                    <p>
                        Tu información de inicio de sesión se procesa de forma segura. ORBIT solo accede a tu lista de juegos.
                    </p>
                </div>
            </div>
        </motion.div>
    );

    return (
        <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={currentScreen === 'main' ? onClose : undefined}
        >
            <motion.div
                className={`link-accounts-modal ${currentScreen !== 'main' ? 'oauth-mode' : ''}`}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <AnimatePresence mode="wait">
                    {currentScreen === 'main' && renderMainScreen()}
                    {currentScreen === 'steam-auth' && renderSteamAuth()}
                    {currentScreen === 'epic-auth' && renderEpicAuth()}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}
