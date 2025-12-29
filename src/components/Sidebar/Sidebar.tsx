import { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard,
    Library,
    Search,
    Trophy,
    User,
    Settings,
    Cloud,
    Gamepad2,
    ChevronLeft,
    ChevronRight,
    Puzzle,
    Download,
    LogIn,
    LogOut,
    Orbit
} from 'lucide-react';
import { useUIStore } from '../../stores';
import { useAuthStore } from '../../stores/authStore';
import { useDownloadsStore } from '../../stores/downloadsStore';
import { AuthModal } from '../AuthModal/AuthModal';
import { FriendsList } from '../FriendsList/FriendsList';
import './Sidebar.css';

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}

export function Sidebar() {
    const { sidebarCollapsed, toggleSidebar, currentPage, setCurrentPage } = useUIStore();
    const { user, userData, initialize, logout } = useAuthStore();
    const { activeDownloads, loadDownloads } = useDownloadsStore();
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        initialize();
        loadDownloads();
    }, []);

    // Dynamic nav items with real download count
    const mainNavItems: NavItem[] = useMemo(() => [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'library', label: 'Biblioteca', icon: <Library size={20} /> },
        { id: 'catalog', label: 'Catálogo', icon: <Search size={20} /> },
        { id: 'downloads', label: 'Descargas', icon: <Download size={20} />, badge: activeDownloads > 0 ? activeDownloads : undefined },
    ], [activeDownloads]);

    const secondaryNavItems: NavItem[] = [
        { id: 'astra', label: 'Astra', icon: <Orbit size={20} /> },
        { id: 'achievements', label: 'Logros', icon: <Trophy size={20} /> },
        { id: 'mods', label: 'Mods', icon: <Puzzle size={20} /> },
        { id: 'cloud', label: 'Nube', icon: <Cloud size={20} /> },
    ];

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const renderNavItem = (item: NavItem) => (
        <button
            key={item.id}
            className={`sidebar-nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
            title={sidebarCollapsed ? item.label : undefined}
        >
            <span className="nav-icon">{item.icon}</span>
            {!sidebarCollapsed && (
                <>
                    <span className="nav-label">{item.label}</span>
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                </>
            )}
            {sidebarCollapsed && item.badge && (
                <span className="nav-badge-dot"></span>
            )}
        </button>
    );

    return (
        <>
            <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-content">
                    {/* Main Navigation */}
                    <nav className="sidebar-nav">
                        <div className="nav-group">
                            {mainNavItems.map(renderNavItem)}
                        </div>

                        <div className="nav-divider"></div>

                        <div className="nav-group">
                            <span className="nav-group-title">
                                {!sidebarCollapsed && 'CARACTERÍSTICAS'}
                            </span>
                            {secondaryNavItems.map(renderNavItem)}
                        </div>
                    </nav>

                    {/* Friends List - only when not collapsed and logged in */}
                    {!sidebarCollapsed && user && (
                        <FriendsList />
                    )}

                    {/* Bottom Navigation */}
                    <div className="sidebar-bottom">
                        <div className="nav-divider"></div>

                        {/* Profile / Login */}
                        {user ? (
                            <button
                                className={`sidebar-nav-item ${currentPage === 'profile' ? 'active' : ''}`}
                                onClick={() => setCurrentPage('profile')}
                                title={sidebarCollapsed ? 'Perfil' : undefined}
                            >
                                <span className="nav-icon user-avatar">
                                    {user.photoURL ? (
                                        <img src={user.photoURL} alt="Avatar" />
                                    ) : (
                                        <User size={20} />
                                    )}
                                </span>
                                {!sidebarCollapsed && (
                                    <span className="nav-label">
                                        {userData?.username || user.displayName || 'Perfil'}
                                    </span>
                                )}
                            </button>
                        ) : (
                            <button
                                className="sidebar-nav-item login-btn"
                                onClick={() => setShowAuthModal(true)}
                                title={sidebarCollapsed ? 'Iniciar sesión' : undefined}
                            >
                                <span className="nav-icon"><LogIn size={20} /></span>
                                {!sidebarCollapsed && <span className="nav-label">Iniciar sesión</span>}
                            </button>
                        )}

                        {/* Settings */}
                        <button
                            className={`sidebar-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
                            onClick={() => setCurrentPage('settings')}
                            title={sidebarCollapsed ? 'Configuración' : undefined}
                        >
                            <span className="nav-icon"><Settings size={20} /></span>
                            {!sidebarCollapsed && <span className="nav-label">Configuración</span>}
                        </button>

                        {/* Logout (only when logged in) */}
                        {user && (
                            <button
                                className="sidebar-nav-item logout-btn"
                                onClick={handleLogout}
                                title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
                            >
                                <span className="nav-icon"><LogOut size={20} /></span>
                                {!sidebarCollapsed && <span className="nav-label">Cerrar sesión</span>}
                            </button>
                        )}

                        <button
                            className="sidebar-toggle"
                            onClick={toggleSidebar}
                            title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
                        >
                            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                            {!sidebarCollapsed && <span>Colapsar</span>}
                        </button>
                    </div>
                </div>

                {/* Currently Playing Indicator */}
                {!sidebarCollapsed && (
                    <div className="sidebar-playing">
                        <div className="playing-indicator">
                            <Gamepad2 size={16} />
                            <span>En órbita</span>
                        </div>
                        <div className="playing-game">
                            <div className="playing-game-cover"></div>
                            <div className="playing-game-info">
                                <span className="playing-game-title">Sin juego activo</span>
                                <span className="playing-game-time">--:--</span>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </>
    );
}
