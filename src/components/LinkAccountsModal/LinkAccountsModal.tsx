import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Link2,
    Unlink,
    RefreshCw,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import { useLaunchersStore } from '../../stores/launchersStore';
import { useNotificationStore } from '../../stores/notificationStore';
import './LinkAccountsModal.css';

// Platform Icons as SVG
const SteamIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.936 3.589 9.021 8.305 9.818l2.682-3.837c-.024.001-.048.002-.073.002-1.893 0-3.449-1.476-3.571-3.343L5.246 12.37C5.088 11.591 5 10.803 5 10c0-3.866 3.134-7 7-7s7 3.134 7 7c0 .803-.088 1.591-.246 2.37l-4.839 1.846A3.58 3.58 0 0 0 12 14c-.025 0-.049-.001-.073-.002l2.682 3.837C19.411 21.021 23 16.936 23 12 23 6.477 18.523 2 12 2z" />
    </svg>
);

const EpicIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M3 2v20h18V2H3zm15 17H6V5h12v14zM8 7v10h2V7H8z" />
    </svg>
);

const GogIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-10h4v4h-4z" />
    </svg>
);

const EaIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
);

const UbisoftIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7z" />
    </svg>
);

interface LinkAccountsModalProps {
    onClose: () => void;
}

export function LinkAccountsModal({ onClose }: LinkAccountsModalProps) {
    const {
        steamAccount,
        steamGames,
        isLinkingSteam,
        linkSteamAccountAuto,
        unlinkSteamAccount,
        syncSteamGames,
        detectLocalSteam
    } = useLinkedAccountsStore();

    const {
        epicInfo,
        gogInfo,
        eaInfo,
        ubisoftInfo,
        isLoading: isLoadingLaunchers,
        detectAllLaunchers
    } = useLaunchersStore();

    const { showSuccess, showError } = useNotificationStore();

    const [isOpeningSteam, setIsOpeningSteam] = useState(false);

    useEffect(() => {
        detectLocalSteam();
        detectAllLaunchers();
    }, [detectLocalSteam, detectAllLaunchers]);

    const handleSteamLogin = async () => {
        setIsOpeningSteam(true);
        try {
            const success = await linkSteamAccountAuto();
            if (success) {
                showSuccess('¡Steam vinculado!', 'Tu cuenta de Steam ha sido detectada');
            } else {
                showError('Error', 'No se pudo vincular Steam');
            }
        } catch {
            showError('Error', 'Error al vincular Steam');
        } finally {
            setIsOpeningSteam(false);
        }
    };

    const handleRefreshAll = async () => {
        await detectAllLaunchers();
        await detectLocalSteam();
        showSuccess('Actualizado', 'Launchers detectados correctamente');
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
                className="link-accounts-modal compact"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div className="modal-title">
                        <Link2 size={20} />
                        <h2>Vincular Cuentas</h2>
                    </div>
                    <div className="header-actions-compact">
                        <button
                            className="btn-refresh-compact"
                            onClick={handleRefreshAll}
                            disabled={isLoadingLaunchers}
                            title="Detectar launchers"
                        >
                            <RefreshCw size={16} className={isLoadingLaunchers ? 'spinning' : ''} />
                        </button>
                        <button className="modal-close" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="modal-content compact">
                    {/* Platforms Grid */}
                    <div className="platforms-grid">
                        {/* Steam */}
                        <div className={`platform-row steam ${steamAccount ? 'linked' : ''}`}>
                            <div className="platform-icon-compact steam-icon">
                                <SteamIcon />
                            </div>
                            <div className="platform-info-compact">
                                <span className="platform-name">Steam</span>
                                {steamAccount ? (
                                    <span className="platform-status linked">
                                        <CheckCircle2 size={12} />
                                        {steamGames.length} juegos
                                    </span>
                                ) : (
                                    <span className="platform-status">No vinculado</span>
                                )}
                            </div>
                            <div className="platform-action">
                                {steamAccount ? (
                                    <>
                                        <button
                                            className="btn-icon-sm"
                                            onClick={() => syncSteamGames()}
                                            title="Sincronizar"
                                        >
                                            <RefreshCw size={14} />
                                        </button>
                                        <button
                                            className="btn-icon-sm danger"
                                            onClick={unlinkSteamAccount}
                                            title="Desvincular"
                                        >
                                            <Unlink size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="btn-link-sm steam"
                                        onClick={handleSteamLogin}
                                        disabled={isLinkingSteam || isOpeningSteam}
                                    >
                                        {isOpeningSteam || isLinkingSteam ? (
                                            <Loader2 size={14} className="spinning" />
                                        ) : (
                                            'Vincular'
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Epic Games */}
                        <div className={`platform-row epic ${epicInfo?.installed ? 'linked' : ''}`}>
                            <div className="platform-icon-compact epic-icon">
                                <EpicIcon />
                            </div>
                            <div className="platform-info-compact">
                                <span className="platform-name">Epic Games</span>
                                {epicInfo?.installed ? (
                                    <span className="platform-status linked">
                                        <CheckCircle2 size={12} />
                                        {epicInfo.gameCount} juegos
                                    </span>
                                ) : (
                                    <span className="platform-status">No detectado</span>
                                )}
                            </div>
                            <div className="platform-action">
                                {epicInfo?.installed && (
                                    <span className="auto-detected">Auto</span>
                                )}
                            </div>
                        </div>

                        {/* GOG */}
                        <div className={`platform-row gog ${gogInfo?.installed ? 'linked' : ''}`}>
                            <div className="platform-icon-compact gog-icon">
                                <GogIcon />
                            </div>
                            <div className="platform-info-compact">
                                <span className="platform-name">GOG Galaxy</span>
                                {gogInfo?.installed ? (
                                    <span className="platform-status linked">
                                        <CheckCircle2 size={12} />
                                        {gogInfo.gameCount} juegos
                                    </span>
                                ) : (
                                    <span className="platform-status">No detectado</span>
                                )}
                            </div>
                            <div className="platform-action">
                                {gogInfo?.installed && (
                                    <span className="auto-detected">Auto</span>
                                )}
                            </div>
                        </div>

                        {/* EA App */}
                        <div className={`platform-row ea ${eaInfo?.installed ? 'linked' : ''}`}>
                            <div className="platform-icon-compact ea-icon">
                                <EaIcon />
                            </div>
                            <div className="platform-info-compact">
                                <span className="platform-name">EA App</span>
                                {eaInfo?.installed ? (
                                    <span className="platform-status linked">
                                        <CheckCircle2 size={12} />
                                        {eaInfo.gameCount} juegos
                                    </span>
                                ) : (
                                    <span className="platform-status">No detectado</span>
                                )}
                            </div>
                            <div className="platform-action">
                                {eaInfo?.installed && (
                                    <span className="auto-detected">Auto</span>
                                )}
                            </div>
                        </div>

                        {/* Ubisoft */}
                        <div className={`platform-row ubisoft ${ubisoftInfo?.installed ? 'linked' : ''}`}>
                            <div className="platform-icon-compact ubisoft-icon">
                                <UbisoftIcon />
                            </div>
                            <div className="platform-info-compact">
                                <span className="platform-name">Ubisoft Connect</span>
                                {ubisoftInfo?.installed ? (
                                    <span className="platform-status linked">
                                        <CheckCircle2 size={12} />
                                        {ubisoftInfo.gameCount} juegos
                                    </span>
                                ) : (
                                    <span className="platform-status">No detectado</span>
                                )}
                            </div>
                            <div className="platform-action">
                                {ubisoftInfo?.installed && (
                                    <span className="auto-detected">Auto</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Note */}
                    <p className="compact-note">
                        ORBIT detecta automáticamente los launchers instalados. Haz clic en actualizar para buscar nuevos juegos.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}
