import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar, Sidebar, AuthScreen, NotificationToast } from './components';
import { Dashboard, Library, Settings, Profile, Catalog, Achievements } from './pages';
import { useUIStore, useSettingsStore } from './stores';
import { useAuthStore } from './stores/authStore';
import './App.css';

// Placeholder pages for navigation
function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-content">
        <h1>{title}</h1>
        <p>{description || 'Esta sección está en desarrollo'}</p>
        <div className="coming-soon-badge">Próximamente</div>
      </div>
    </div>
  );
}

// Loading screen while checking auth
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <div className="orbit-ring"></div>
        <div className="orbit-core"></div>
      </div>
      <p>Cargando ORBIT...</p>
    </div>
  );
}

function App() {
  const { currentPage } = useUIStore();
  const { loadSettings, settings } = useSettingsStore();
  const { user, isInitialized, initialize, isAvailable } = useAuthStore();

  useEffect(() => {
    loadSettings();
    initialize();
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const renderPage = () => {
    const pageVariants = {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 }
    };

    const pageTransition = {
      type: 'tween' as const,
      duration: 0.2
    };

    const wrapPage = (key: string, component: React.ReactNode) => (
      <motion.div
        key={key}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="page-wrapper"
      >
        {component}
      </motion.div>
    );

    switch (currentPage) {
      case 'dashboard':
        return wrapPage('dashboard', <Dashboard />);
      case 'library':
        return wrapPage('library', <Library />);
      case 'catalog':
        return wrapPage('catalog', <Catalog />);
      case 'settings':
        return wrapPage('settings', <Settings />);
      case 'profile':
        return wrapPage('profile', <Profile />);
      case 'downloads':
        return wrapPage('downloads', <PlaceholderPage title="Descargas" description="Gestiona tus descargas activas y cola de instalación" />);
      case 'achievements':
        return wrapPage('achievements', <Achievements />);
      case 'mods':
        return wrapPage('mods', <PlaceholderPage title="Mod Manager" description="Instala y gestiona mods para tus juegos favoritos" />);
      case 'cloud':
        return wrapPage('cloud', <PlaceholderPage title="Guardado en la Nube" description="Sincroniza tu progreso entre todos tus dispositivos" />);
      default:
        return wrapPage('dashboard', <Dashboard />);
    }
  };

  // Show loading screen while checking auth
  if (!isInitialized) {
    return (
      <div className="app">
        <TitleBar />
        <LoadingScreen />
      </div>
    );
  }

  // If Firebase is available but user is not logged in, show auth screen
  if (isAvailable && !user) {
    return (
      <div className="app">
        <TitleBar />
        <AuthScreen />
      </div>
    );
  }

  // If Firebase is not available, still allow using the app (offline mode)
  // But show a warning - or require login if you prefer strict mode
  // For now, we'll require login if Firebase is available

  return (
    <div className="app">
      <TitleBar />
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <AnimatePresence mode="wait">
            {renderPage()}
          </AnimatePresence>
        </main>
      </div>
      <NotificationToast />
    </div>
  );
}

export default App;
