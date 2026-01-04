import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Users, Settings, Activity, Shield, Clock, X, Maximize2, Cpu, Zap, Database, Palette, Keyboard, LogOut } from 'lucide-react';
import { useFriendsStore } from '../../stores/friendsStore';
import { useAuthStore } from '../../stores/authStore';
import './Overlay.css';

interface PanelState {
    id: string;
    isOpen: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
}

function DraggablePanel({
    id,
    panel,
    onClose,
    onFocus,
    onResize,
    children,
    Icon,
    title
}: {
    id: string,
    panel: PanelState,
    onClose: () => void,
    onFocus: () => void,
    onResize: (id: string, e: React.MouseEvent) => void,
    children: React.ReactNode,
    Icon: any,
    title: string
}) {
    const controls = useDragControls();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            drag
            dragControls={controls}
            dragListener={false}
            dragMomentum={false}
            onPointerDown={onFocus}
            style={{
                position: 'absolute',
                left: panel.x,
                top: panel.y,
                width: panel.width,
                height: panel.height,
                zIndex: panel.zIndex,
            }}
            className="hud-panel dynamic-panel"
        >
            <div className="panel-header drag-handle" onPointerDown={(e) => controls.start(e)}>
                <div className="header-icon-title">
                    <Icon size={18} className="panel-icon-accent" />
                    <h3>{title}</h3>
                </div>
                <button className="premium-close-btn" onClick={(e) => { e.stopPropagation(); onClose(); }}>
                    <X size={14} />
                </button>
            </div>

            <div className="panel-inner custom-scrollbar">
                {children}
            </div>

            <div
                className="resize-handle"
                onMouseDown={(e) => onResize(id, e)}
            >
                <div className="resize-dot"></div>
            </div>
        </motion.div>
    );
}

export default function Overlay() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const { friends, subscribeToFriends } = useFriendsStore();
    const { user } = useAuthStore();

    const [stats, setStats] = useState({
        cpu: 0, ram: 0, ramUsed: 0, ramTotal: 0, gpu: 0, gpuTemp: 0, cpuTemp: 0
    });

    const [hudColor, setHudColor] = useState('#00d4ff');

    const [openPanels, setOpenPanels] = useState<Record<string, PanelState>>({
        friends: { id: 'friends', isOpen: true, x: 80, y: 120, width: 320, height: 480, zIndex: 10 },
        stats: { id: 'stats', isOpen: false, x: 420, y: 120, width: 380, height: 400, zIndex: 10 },
        settings: { id: 'settings', isOpen: false, x: 820, y: 120, width: 350, height: 450, zIndex: 10 },
    });
    const [topZIndex, setTopZIndex] = useState(10);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        let unsubscribe = () => { };
        if (user) {
            unsubscribe = subscribeToFriends(user.uid);
        }

        // Stats Polling - Check for bridge dynamically
        const statsTimer = setInterval(async () => {
            if ((window as any).csharp) {
                try {
                    const newStats = await (window as any).csharp.invoke('get-system-stats');
                    if (newStats) setStats(newStats);
                } catch (e) {
                    console.error('Failed to get stats', e);
                }
            }
        }, 2000);

        const loadConfig = async () => {
            // Check for bridge multiple times if needed (wait for injection)
            const checkBridge = async () => {
                if ((window as any).csharp) {
                    try {
                        const config = await (window as any).csharp.invoke('get-hud-config');
                        if (config?.color) setHudColor(config.color);
                    } catch { }
                } else {
                    setTimeout(checkBridge, 100);
                }
            };
            checkBridge();
        };
        loadConfig();

        return () => {
            clearInterval(timer);
            clearInterval(statsTimer);
            unsubscribe();
        };
    }, [user]);

    useEffect(() => {
        document.documentElement.style.setProperty('--hud-accent', hudColor);
    }, [hudColor]);

    const togglePanel = (id: string) => {
        setOpenPanels(prev => {
            const isOpening = !prev[id].isOpen;
            return {
                ...prev,
                [id]: {
                    ...prev[id],
                    isOpen: isOpening,
                    zIndex: isOpening ? topZIndex + 1 : prev[id].zIndex
                }
            };
        });
        if (!openPanels[id].isOpen) setTopZIndex(topZIndex + 1);
    };

    const bringToFront = (id: string) => {
        setTopZIndex(prev => {
            const nextZ = prev + 1;
            setOpenPanels(panels => ({
                ...panels,
                [id]: { ...panels[id], zIndex: nextZ }
            }));
            return nextZ;
        });
    };

    const handleResize = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = openPanels[id].width;
        const startHeight = openPanels[id].height;

        const onMouseMove = (me: MouseEvent) => {
            setOpenPanels(prev => ({
                ...prev,
                [id]: {
                    ...prev[id],
                    width: Math.max(280, startWidth + (me.clientX - startX)),
                    height: Math.max(200, startHeight + (me.clientY - startY))
                }
            }));
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const saveSettings = async (color: string) => {
        setHudColor(color);
        if ((window as any).csharp) {
            await (window as any).csharp.invoke('save-hud-settings', { color });
        }
    };

    const handleKillGame = async () => {
        if ((window as any).csharp) {
            try {
                const result = await (window as any).csharp.invoke('kill-game');
                if (result.success) {
                    alert('Juego cerrado con éxito');
                } else {
                    alert('No se pudo cerrar el juego o no hay ninguno activo.');
                }
            } catch (e) {
                console.error('Error killing game', e);
            }
        }
    };

    return (
        <div className="hud-container">
            <div className="hud-top-bar">
                <div className="hud-left">
                    <div className="hud-logo">
                        <div className="hud-orbit-ring"></div>
                        <span>ORBIT <small>HUD</small></span>
                    </div>
                </div>

                <div className="hud-center">
                    <div className="hud-shortcuts">
                        <button className={`hud-icon-btn ${openPanels.friends.isOpen ? 'active' : ''}`} onClick={() => togglePanel('friends')}><Users size={20} /><span>Amigos</span></button>
                        <button className={`hud-icon-btn ${openPanels.stats.isOpen ? 'active' : ''}`} onClick={() => togglePanel('stats')}><Activity size={20} /><span>Stats</span></button>
                        <button className={`hud-icon-btn ${openPanels.settings.isOpen ? 'active' : ''}`} onClick={() => togglePanel('settings')}><Settings size={20} /><span>Ajustes</span></button>
                    </div>
                </div>

                <div className="hud-right">
                    <div className="hud-clock">
                        <Clock size={14} />
                        <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </div>

            <div className="hud-workspace">
                <AnimatePresence>
                    {openPanels.friends.isOpen && (
                        <DraggablePanel id="friends" panel={openPanels.friends} Icon={Users} title="Comunidad" onClose={() => togglePanel('friends')} onFocus={() => bringToFront('friends')} onResize={handleResize}>
                            <div className="friend-list">
                                {friends.length > 0 ? friends.map(friend => (
                                    <div key={friend.id} className="hud-friend-item">
                                        <div className="hud-avatar" style={{ background: friend.status === 'in-game' ? 'var(--hud-accent)' : '#252535' }}>
                                            {friend.avatar ? <img src={friend.avatar} alt="" /> : (friend.displayName ? friend.displayName[0] : '?')}
                                        </div>
                                        <div className="hud-friend-info">
                                            <div className="hud-friend-name">{friend.displayName}</div>
                                            <div className={`hud-friend-status ${friend.status}`}>
                                                {friend.status === 'in-game' ? `En ${friend.currentGame || 'un juego'}` : friend.status}
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty-state">No hay amigos conectados</div>
                                )}
                            </div>
                        </DraggablePanel>
                    )}

                    {openPanels.stats.isOpen && (
                        <DraggablePanel id="stats" panel={openPanels.stats} Icon={Activity} title="Monitor de Rendimiento" onClose={() => togglePanel('stats')} onFocus={() => bringToFront('stats')} onResize={handleResize}>
                            <div className="hud-stats-dashboard">
                                <div className="stat-group">
                                    <div className="stat-header"><Cpu size={16} /><span>PROCESADOR (CPU)</span></div>
                                    <div className="stat-bar-container"><div className="stat-bar" style={{ width: `${stats.cpu}%` }}></div></div>
                                    <div className="stat-footer"><span>Uso: {stats.cpu}%</span><span>{stats.cpuTemp}°C</span></div>
                                </div>
                                <div className="stat-group">
                                    <div className="stat-header"><Zap size={16} /><span>GRÁFICOS (GPU)</span></div>
                                    <div className="stat-bar-container"><div className="stat-bar" style={{ width: `${stats.gpu}%`, backgroundColor: '#4ade80' }}></div></div>
                                    <div className="stat-footer"><span>Uso: {stats.gpu}%</span><span>{stats.gpuTemp}°C</span></div>
                                </div>
                                <div className="stat-group">
                                    <div className="stat-header"><Database size={16} /><span>MEMORIA (RAM)</span></div>
                                    <div className="stat-bar-container"><div className="stat-bar" style={{ width: `${stats.ram}%`, backgroundColor: '#fbbf24' }}></div></div>
                                    <div className="stat-footer"><span>{stats.ramUsed}GB / {stats.ramTotal}GB</span><span>{Math.round(stats.ram)}%</span></div>
                                </div>
                            </div>
                        </DraggablePanel>
                    )}

                    {openPanels.settings.isOpen && (
                        <DraggablePanel id="settings" panel={openPanels.settings} Icon={Shield} title="Configuración HUD" onClose={() => togglePanel('settings')} onFocus={() => bringToFront('settings')} onResize={handleResize}>
                            <div className="hud-settings-content">
                                <div className="setting-section">
                                    <div className="section-title"><Palette size={14} /> Personalización</div>
                                    <div className="color-grid">
                                        {['#00d4ff', '#6366f1', '#f472b6', '#4ade80', '#fbbf24', '#f8fafc'].map(color => (
                                            <button key={color} className={`color-swatch ${hudColor === color ? 'active' : ''}`} style={{ backgroundColor: color }} onClick={() => saveSettings(color)} />
                                        ))}
                                    </div>
                                </div>
                                <div className="setting-section">
                                    <div className="section-title"><Keyboard size={14} /> Atajos Globales</div>
                                    <div className="shortcut-item">
                                        <span>Abrir Overlay</span>
                                        <div className="kbd-shortcut">CTRL + SHIFT + O</div>
                                    </div>
                                </div>
                                <div className="setting-section">
                                    <div className="section-title"><LogOut size={14} /> Acciones del Sistema</div>
                                    <button className="premium-action-btn danger" onClick={handleKillGame}>
                                        <LogOut size={16} />
                                        <span>Cerrar Juego Actual</span>
                                    </button>
                                </div>
                            </div>
                        </DraggablePanel>
                    )}
                </AnimatePresence>
            </div>

            <div className="hud-dimmer"></div>
        </div>
    );
}
