import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight, X, Lock, Unlock } from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import './SteamAchievements.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

interface Achievement {
    apiname: string;
    achieved: number;
    unlocktime: number;
    name?: string;
    description?: string;
}

interface SteamAchievementsProps {
    steamAppId: number | string | undefined;
    steamId: string | undefined;
    gameName: string;
}

export function SteamAchievements({ steamAppId, steamId, gameName }: SteamAchievementsProps) {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        if (steamAppId && steamId) {
            loadAchievements();
        }
    }, [steamAppId, steamId]);

    const loadAchievements = async () => {
        if (!steamAppId || !steamId) return;

        setIsLoading(true);
        setError(null);

        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (!ipcRenderer) {
                setError('Solo disponible en la app de escritorio');
                return;
            }

            const result = await ipcRenderer.invoke('steam-get-achievements', {
                steamId,
                appId: steamAppId
            });

            if (result.success && result.achievements) {
                // Sort: unlocked first, then by unlock time (newest first)
                const sorted = [...result.achievements].sort((a, b) => {
                    if (a.achieved !== b.achieved) return b.achieved - a.achieved;
                    return b.unlocktime - a.unlocktime;
                });
                setAchievements(sorted);
            } else {
                setAchievements([]);
            }
        } catch (err) {
            console.error('Error loading achievements:', err);
            setError('Error al cargar logros');
        } finally {
            setIsLoading(false);
        }
    };

    // Don't render if no Steam info
    if (!steamAppId || !steamId) {
        return null;
    }

    const unlockedCount = achievements.filter(a => a.achieved).length;
    const totalCount = achievements.length;
    const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;
    const previewAchievements = achievements.slice(0, 5);

    if (isLoading) {
        return (
            <section className="content-section achievements-section">
                <h3><Trophy size={16} /> Logros de Steam</h3>
                <div className="achievements-loading">
                    <div className="loading-spinner"></div>
                    <span>Cargando logros...</span>
                </div>
            </section>
        );
    }

    if (error || achievements.length === 0) {
        return null; // Don't show section if no achievements
    }

    return (
        <>
            <section className="content-section achievements-section">
                <div className="achievements-header">
                    <h3><Trophy size={16} /> Logros de Steam</h3>
                    <div className="achievements-summary">
                        <div className="achievement-progress-bar">
                            <div
                                className="achievement-progress-fill"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                        <span className="achievement-count">
                            {unlockedCount} / {totalCount} ({percentage}%)
                        </span>
                    </div>
                </div>

                <div className="achievements-preview">
                    {previewAchievements.map((achievement) => (
                        <div
                            key={achievement.apiname}
                            className={`achievement-item ${achievement.achieved ? 'unlocked' : 'locked'}`}
                        >
                            <div className="achievement-icon">
                                {achievement.achieved ? (
                                    <Unlock size={16} />
                                ) : (
                                    <Lock size={16} />
                                )}
                            </div>
                            <div className="achievement-info">
                                <span className="achievement-name">
                                    {achievement.name || achievement.apiname}
                                </span>
                                {achievement.description && (
                                    <span className="achievement-desc">{achievement.description}</span>
                                )}
                            </div>
                            {achievement.achieved && achievement.unlocktime > 0 && (
                                <span className="achievement-date">
                                    {new Date(achievement.unlocktime * 1000).toLocaleDateString('es-ES')}
                                </span>
                            )}
                        </div>
                    ))}
                </div>

                {achievements.length > 5 && (
                    <button className="view-all-achievements" onClick={() => setShowAll(true)}>
                        Ver todos los logros
                        <ChevronRight size={16} />
                    </button>
                )}
            </section>

            {/* Full Achievements Modal */}
            <ModalPortal>
                <AnimatePresence>
                    {showAll && (
                        <motion.div
                            className="achievements-modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAll(false)}
                        >
                            <motion.div
                                className="achievements-modal"
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="achievements-modal-header">
                                    <div className="modal-title-row">
                                        <Trophy size={24} />
                                        <div>
                                            <h2>Logros de Steam</h2>
                                            <span className="modal-game-name">{gameName}</span>
                                        </div>
                                    </div>
                                    <button className="close-modal" onClick={() => setShowAll(false)}>
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="achievements-modal-summary">
                                    <div className="big-progress">
                                        <div className="progress-circle">
                                            <svg viewBox="0 0 100 100">
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="45"
                                                    fill="none"
                                                    stroke="rgba(255,255,255,0.1)"
                                                    strokeWidth="10"
                                                />
                                                <circle
                                                    cx="50"
                                                    cy="50"
                                                    r="45"
                                                    fill="none"
                                                    stroke="url(#progressGradient)"
                                                    strokeWidth="10"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${percentage * 2.83} 283`}
                                                    transform="rotate(-90 50 50)"
                                                />
                                                <defs>
                                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#10b981" />
                                                        <stop offset="100%" stopColor="#34d399" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="progress-text">
                                                <span className="percentage">{percentage}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="summary-stats">
                                        <div className="stat-item">
                                            <Unlock size={20} />
                                            <span className="stat-value">{unlockedCount}</span>
                                            <span className="stat-label">Desbloqueados</span>
                                        </div>
                                        <div className="stat-item">
                                            <Lock size={20} />
                                            <span className="stat-value">{totalCount - unlockedCount}</span>
                                            <span className="stat-label">Bloqueados</span>
                                        </div>
                                        <div className="stat-item">
                                            <Trophy size={20} />
                                            <span className="stat-value">{totalCount}</span>
                                            <span className="stat-label">Total</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="achievements-full-list">
                                    {achievements.map((achievement) => (
                                        <div
                                            key={achievement.apiname}
                                            className={`achievement-item-full ${achievement.achieved ? 'unlocked' : 'locked'}`}
                                        >
                                            <div className="achievement-icon-full">
                                                {achievement.achieved ? (
                                                    <Unlock size={24} />
                                                ) : (
                                                    <Lock size={24} />
                                                )}
                                            </div>
                                            <div className="achievement-info-full">
                                                <span className="achievement-name-full">
                                                    {achievement.name || achievement.apiname}
                                                </span>
                                                {achievement.description && (
                                                    <span className="achievement-desc-full">
                                                        {achievement.description}
                                                    </span>
                                                )}
                                            </div>
                                            {achievement.achieved && achievement.unlocktime > 0 && (
                                                <div className="achievement-unlock-info">
                                                    <span className="unlock-date">
                                                        {new Date(achievement.unlocktime * 1000).toLocaleDateString('es-ES', {
                                                            day: 'numeric',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </ModalPortal>
        </>
    );
}
