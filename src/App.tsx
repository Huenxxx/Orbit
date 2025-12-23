import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar, Sidebar } from './components';
import { Dashboard, Library, Settings, Profile, Catalog } from './pages';
import { useUIStore, useSettingsStore } from './stores';
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

function App() {
  const { currentPage } = useUIStore();
  const { loadSettings, settings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
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
      type: 'tween',
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
        return wrapPage('achievements', <PlaceholderPage title="Logros" description="Visualiza tus logros y progreso en todos tus juegos" />);
      case 'mods':
        return wrapPage('mods', <PlaceholderPage title="Mod Manager" description="Instala y gestiona mods para tus juegos favoritos" />);
      case 'cloud':
        return wrapPage('cloud', <PlaceholderPage title="Guardado en la Nube" description="Sincroniza tu progreso entre todos tus dispositivos" />);
      default:
        return wrapPage('dashboard', <Dashboard />);
    }
  };

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
    </div>
  );
}

export default App;
