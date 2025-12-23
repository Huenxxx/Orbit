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
    Download
} from 'lucide-react';
import { useUIStore } from '../../stores';
import './Sidebar.css';

interface NavItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    badge?: number;
}

const mainNavItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'library', label: 'Biblioteca', icon: <Library size={20} /> },
    { id: 'catalog', label: 'Catálogo', icon: <Search size={20} /> },
    { id: 'downloads', label: 'Descargas', icon: <Download size={20} />, badge: 2 },
];

const secondaryNavItems: NavItem[] = [
    { id: 'achievements', label: 'Logros', icon: <Trophy size={20} /> },
    { id: 'mods', label: 'Mods', icon: <Puzzle size={20} /> },
    { id: 'cloud', label: 'Nube', icon: <Cloud size={20} /> },
];

const bottomNavItems: NavItem[] = [
    { id: 'profile', label: 'Perfil', icon: <User size={20} /> },
    { id: 'settings', label: 'Configuración', icon: <Settings size={20} /> },
];

export function Sidebar() {
    const { sidebarCollapsed, toggleSidebar, currentPage, setCurrentPage } = useUIStore();

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

                {/* Bottom Navigation */}
                <div className="sidebar-bottom">
                    <div className="nav-divider"></div>
                    {bottomNavItems.map(renderNavItem)}

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
    );
}
