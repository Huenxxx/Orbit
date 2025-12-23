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
    ExternalLink
} from 'lucide-react';
import { useSettingsStore } from '../../stores';
import './Settings.css';

export function Settings() {
    const { settings, updateSettings } = useSettingsStore();

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
