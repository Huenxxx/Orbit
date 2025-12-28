import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Settings as SettingsIcon,
    Palette,
    Bell,
    Cloud,
    Monitor,
    Globe,
    Shield,
    Info,
    Moon,
    Sun,
    ChevronRight,
    ExternalLink,
    Link,
    Unlink,
    Loader2,
    User,
    Gamepad2
} from 'lucide-react';
import { useSettingsStore } from '../../stores';
import { useLinkedAccountsStore } from '../../stores/linkedAccountsStore';
import './Settings.css';

// Steam icon SVG component
const SteamIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 5.628 3.875 10.35 9.101 11.647l2.063-2.063a8.002 8.002 0 0 1-4.164-4.164l-2.063 2.063A11.944 11.944 0 0 1 0 12C0 5.373 5.373 0 12 0zm0 2.182c-5.422 0-9.818 4.396-9.818 9.818 0 2.164.7 4.164 1.885 5.79l3.344-3.344a3.27 3.27 0 0 1 2.952-4.355c.182-.009.364.006.545.042l1.974-2.84a5.09 5.09 0 0 1 5.09 5.09v.364l2.814-1.974a3.273 3.273 0 0 1 4.396 2.952c.009.182-.006.364-.042.545l3.344 3.344a9.772 9.772 0 0 0 1.885-5.79c0-5.422-4.396-9.818-9.818-9.818z" />
        <circle cx="8.5" cy="14.5" r="2.5" />
        <circle cx="16" cy="9" r="2" />
    </svg>
);

// Epic Games icon SVG component
const EpicIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0L0 2.4v19.2L12 24l12-2.4V2.4L12 0zm10 20.4l-10 2-10-2V3.6l10-2 10 2v16.8zM12 5.4l-6 1.2v10.8l6 1.2 6-1.2V6.6l-6-1.2zm4 10.2l-4 .8-4-.8V8.4l4-.8 4 .8v7.2z" />
    </svg>
);

export function Settings() {
    const { settings, updateSettings } = useSettingsStore();
    const {
        steamAccount,
        isLinkingSteam,
        steamLevel,
        steamGames,
        linkSteamWithOpenID,
        unlinkSteamAccount,
        epicAccount,
        isLinkingEpic,
        epicGames,
        linkEpicAccount,
        unlinkEpicAccount,
        error
    } = useLinkedAccountsStore();


    const [epicClientId, setEpicClientId] = useState('');
    const [epicClientSecret, setEpicClientSecret] = useState('');
    const [isSavingEpicKeys, setIsSavingEpicKeys] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Load Epic keys on mount
    useEffect(() => {
        const loadEpicKeys = async () => {
            const keys = await (window as any).require('electron').ipcRenderer.invoke('epic-get-api-keys');
            if (keys) {
                setEpicClientId(keys.clientId || '');
                setEpicClientSecret(keys.clientSecret || '');
            }
        };
        loadEpicKeys();
    }, []);

    const handleSaveEpicKeys = async () => {
        setIsSavingEpicKeys(true);
        setSaveSuccess(false);
        try {
            await (window as any).require('electron').ipcRenderer.invoke('epic-set-api-keys', {
                clientId: epicClientId,
                clientSecret: epicClientSecret
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving Epic keys:', err);
        } finally {
            setIsSavingEpicKeys(false);
        }
    };

    const settingsSections = [
        {
            id: 'appearance',
            title: 'Apariencia',
            icon: <Palette size={20} />,
            items: [
                {
                    id: 'theme',
                    label: 'Tema',
                    description: 'Cambia entre tema claro y oscuro',
                    type: 'toggle-group',
                    options: [
                        { value: 'dark', label: 'Oscuro', icon: <Moon size={16} /> },
                        { value: 'light', label: 'Claro', icon: <Sun size={16} /> },
                        { value: 'system', label: 'Sistema', icon: <Monitor size={16} /> }
                    ],
                    value: settings.theme,
                    onChange: (value: string) => updateSettings({ theme: value as any })
                }
            ]
        },
        {
            id: 'general',
            title: 'General',
            icon: <SettingsIcon size={20} />,
            items: [
                {
                    id: 'language',
                    label: 'Idioma',
                    description: 'Idioma de la interfaz',
                    type: 'select',
                    options: [
                        { value: 'es', label: 'Español' },
                        { value: 'en', label: 'English' },
                        { value: 'pt', label: 'Português' }
                    ],
                    value: settings.language,
                    onChange: (value: string) => updateSettings({ language: value })
                },
                {
                    id: 'launchAtStartup',
                    label: 'Iniciar con Windows',
                    description: 'Abrir ORBIT automáticamente al encender el PC',
                    type: 'toggle',
                    value: settings.launchAtStartup,
                    onChange: (value: boolean) => updateSettings({ launchAtStartup: value })
                },
                {
                    id: 'minimizeToTray',
                    label: 'Minimizar a bandeja',
                    description: 'Mantener ORBIT ejecutándose en segundo plano',
                    type: 'toggle',
                    value: settings.minimizeToTray,
                    onChange: (value: boolean) => updateSettings({ minimizeToTray: value })
                }
            ]
        },
        {
            id: 'notifications',
            title: 'Notificaciones',
            icon: <Bell size={20} />,
            items: [
                {
                    id: 'notifications',
                    label: 'Notificaciones',
                    description: 'Recibir notificaciones de la aplicación',
                    type: 'toggle',
                    value: settings.notifications,
                    onChange: (value: boolean) => updateSettings({ notifications: value })
                }
            ]
        },
        {
            id: 'integrations',
            title: 'Integraciones',
            icon: <Globe size={20} />,
            items: [
                {
                    id: 'discordRpc',
                    label: 'Discord Rich Presence',
                    description: 'Mostrar tu actividad de juego en Discord',
                    type: 'toggle',
                    value: settings.discordRpc,
                    onChange: (value: boolean) => updateSettings({ discordRpc: value })
                }
            ]
        },
        {
            id: 'cloud',
            title: 'Sincronización',
            icon: <Cloud size={20} />,
            items: [
                {
                    id: 'autoSync',
                    label: 'Sincronización automática',
                    description: 'Sincronizar datos automáticamente con la nube',
                    type: 'toggle',
                    value: settings.autoSync,
                    onChange: (value: boolean) => updateSettings({ autoSync: value })
                }
            ]
        }
    ];

    const renderSettingItem = (item: any) => {
        switch (item.type) {
            case 'toggle':
                return (
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={item.value}
                            onChange={(e) => item.onChange(e.target.checked)}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                );

            case 'toggle-group':
                return (
                    <div className="toggle-group">
                        {item.options.map((opt: any) => (
                            <button
                                key={opt.value}
                                className={`toggle-option ${item.value === opt.value ? 'active' : ''}`}
                                onClick={() => item.onChange(opt.value)}
                            >
                                {opt.icon}
                                <span>{opt.label}</span>
                            </button>
                        ))}
                    </div>
                );

            case 'select':
                return (
                    <select
                        className="settings-select"
                        value={item.value}
                        onChange={(e) => item.onChange(e.target.value)}
                    >
                        {item.options.map((opt: any) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );

            default:
                return null;
        }
    };

    return (
        <motion.div
            className="settings-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <header className="settings-header">
                <h1>Configuración</h1>
                <p>Personaliza tu experiencia en ORBIT</p>
            </header>

            <div className="settings-content">
                <div className="settings-sections">
                    {settingsSections.map((section, sectionIndex) => (
                        <motion.section
                            key={section.id}
                            className="settings-section"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: sectionIndex * 0.05 }}
                        >
                            <div className="section-header">
                                {section.icon}
                                <h2>{section.title}</h2>
                            </div>

                            <div className="section-items">
                                {section.items.map((item) => (
                                    <div key={item.id} className="setting-item">
                                        <div className="setting-info">
                                            <span className="setting-label">{item.label}</span>
                                            <span className="setting-description">{item.description}</span>
                                        </div>
                                        <div className="setting-control">
                                            {renderSettingItem(item)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    ))}
                </div>

                {/* Steam Linked Accounts Section */}
                <motion.section
                    className="settings-section linked-accounts-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <div className="section-header">
                        <Link size={20} />
                        <h2>Cuentas vinculadas</h2>
                    </div>

                    <div className="section-items">
                        {/* Steam Account */}
                        <div className="linked-account-card">
                            <div className="account-main-row">
                                <div className="account-platform">
                                    <SteamIcon />
                                    <span>Steam</span>
                                </div>

                                {steamAccount ? (
                                    <div className="account-info">
                                        <div className="account-avatar">
                                            {steamAccount.avatarUrl ? (
                                                <img src={steamAccount.avatarUrl} alt={steamAccount.username} />
                                            ) : (
                                                <User size={24} />
                                            )}
                                        </div>
                                        <div className="account-details">
                                            <span className="account-username">{steamAccount.username}</span>
                                            <span className="account-meta">
                                                {steamLevel !== null && <span className="steam-level">Nivel {steamLevel}</span>}
                                                {steamGames.length > 0 && <span className="steam-games"><Gamepad2 size={12} /> {steamGames.length} juegos</span>}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-sm unlink-btn"
                                            onClick={unlinkSteamAccount}
                                        >
                                            <Unlink size={14} />
                                            Desvincular
                                        </button>
                                    </div>
                                ) : (
                                    <div className="account-not-linked">
                                        <span>No vinculada</span>
                                        <button
                                            className="btn btn-steam"
                                            onClick={linkSteamWithOpenID}
                                            disabled={isLinkingSteam}
                                        >
                                            {isLinkingSteam ? (
                                                <>
                                                    <Loader2 size={16} className="spinner" />
                                                    Conectando...
                                                </>
                                            ) : (
                                                <>
                                                    <SteamIcon />
                                                    Iniciar sesión con Steam
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Epic Games Account */}
                        <div className="linked-account-card">
                            <div className="account-main-row">
                                <div className="account-platform">
                                    <span className="epic-icon-container">
                                        <EpicIcon />
                                    </span>
                                    <span>Epic Games</span>
                                </div>

                                {epicAccount ? (
                                    <div className="account-info">
                                        <div className="account-avatar">
                                            <div className="epic-avatar-placeholder">
                                                {epicAccount.username[0].toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="account-details">
                                            <span className="account-username">{epicAccount.username}</span>
                                            <span className="account-meta">
                                                {epicGames.length > 0 && <span className="epic-games"><Gamepad2 size={12} /> {epicGames.length} juegos</span>}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-ghost btn-sm unlink-btn"
                                            onClick={unlinkEpicAccount}
                                        >
                                            <Unlink size={14} />
                                            Desvincular
                                        </button>
                                    </div>
                                ) : (
                                    <div className="account-not-linked">
                                        <span>No vinculada</span>
                                        <button
                                            className="btn btn-epic"
                                            onClick={linkEpicAccount}
                                            disabled={isLinkingEpic}
                                        >
                                            {isLinkingEpic ? (
                                                <>
                                                    <Loader2 size={16} className="spinner" />
                                                    Conectando...
                                                </>
                                            ) : (
                                                <>
                                                    <EpicIcon />
                                                    Iniciar sesión con Epic
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Advanced Epic Configuration */}
                            <div className="epic-advanced-config">
                                <div className="config-header">
                                    <Shield size={14} />
                                    <span>Configuración Avanzada (Full Link)</span>
                                </div>
                                <p className="config-help">
                                    Desbloquea amigos y logros introduciendo tus propias credenciales de desarrollador de Epic Games.
                                </p>
                                <div className="config-fields">
                                    <div className="config-field">
                                        <label>Client ID</label>
                                        <input
                                            type="password"
                                            value={epicClientId}
                                            onChange={(e) => setEpicClientId(e.target.value)}
                                            placeholder="Introduce tu Client ID"
                                            autoComplete="off"
                                        />
                                    </div>
                                    <div className="config-field">
                                        <label>Client Secret</label>
                                        <input
                                            type="password"
                                            value={epicClientSecret}
                                            onChange={(e) => setEpicClientSecret(e.target.value)}
                                            placeholder="Introduce tu Client Secret"
                                            autoComplete="off"
                                        />
                                    </div>
                                </div>
                                <button
                                    className={`btn btn-sm btn-save-keys ${saveSuccess ? 'btn-success' : 'btn-ghost'}`}
                                    onClick={handleSaveEpicKeys}
                                    disabled={isSavingEpicKeys}
                                >
                                    {isSavingEpicKeys ? (
                                        <Loader2 size={14} className="spinner" />
                                    ) : saveSuccess ? (
                                        '✓ Credenciales Guardadas'
                                    ) : (
                                        'Guardar credenciales'
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="account-error">
                                {error}
                            </div>
                        )}
                    </div>
                </motion.section>

                {/* About Section */}
                <motion.section
                    className="settings-section about-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="section-header">
                        <Info size={20} />
                        <h2>Acerca de</h2>
                    </div>

                    <div className="about-content">
                        <div className="app-info">
                            <div className="app-logo">
                                <div className="orbit-icon-large">
                                    <div className="orbit-ring"></div>
                                    <div className="orbit-core"></div>
                                </div>
                            </div>
                            <div className="app-details">
                                <h3>ORBIT</h3>
                                <p>El centro de gravedad de todos tus juegos</p>
                                <span className="version">Versión 1.0.0</span>
                            </div>
                        </div>

                        <div className="about-links">
                            <button className="about-link">
                                <Shield size={16} />
                                Política de privacidad
                                <ChevronRight size={16} />
                            </button>
                            <button className="about-link">
                                <ExternalLink size={16} />
                                Sitio web
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </motion.section>
            </div>
        </motion.div>
    );
}
