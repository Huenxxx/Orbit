import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TitleBar, Sidebar, AuthScreen, NotificationToast, EditGameModal, ConfirmModal } from './components';
import { Dashboard, Library, Settings, Profile, Catalog, Achievements, GameDetails, Downloads, Astra, Cloud, Overlay } from './pages';
import { useUIStore, useSettingsStore, useGamesStore } from './stores';
import { useAuthStore } from './stores/authStore';
import { useLinkedAccountsStore } from './stores/linkedAccountsStore';
import { useDownloadsStore } from './stores/downloadsStore';
import { useNotificationStore } from './stores/notificationStore';
import './App.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

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
  const { currentPage, modalOpen, closeModal, navigateTo, confirmModal, closeConfirmModal } = useUIStore();
  const { loadSettings, settings } = useSettingsStore();
  const { user, isInitialized, initialize, isAvailable } = useAuthStore();
  const { selectedGame, setSelectedGame } = useGamesStore();
  const { loadLinkedAccounts } = useLinkedAccountsStore();
  const { addDownload } = useDownloadsStore();
  const { showSuccess, showError } = useNotificationStore();

  useEffect(() => {
    loadSettings();
    initialize();
    loadLinkedAccounts();

    // Initial route detection from hash
    const hash = window.location.hash;
    if (hash === '#/overlay') {
      navigateTo('overlay');
    }

    // Listen for magnet URIs from main process
    const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
    if (ipcRenderer) {
      const handleMagnetReceived = async (_event: unknown, magnetUri: string) => {
        console.log('Received magnet via IPC:', magnetUri);
        try {
          // Extract name from magnet URI if possible
          const dnMatch = magnetUri.match(/dn=([^&]+)/);
          const name = dnMatch ? decodeURIComponent(dnMatch[1].replace(/\+/g, ' ')) : 'Descarga de Torrent';

          await addDownload(name, magnetUri);
          showSuccess('Descarga añadida', `${name} ha sido añadido a la cola de descargas`);
          navigateTo('downloads');
        } catch (error) {
          console.error('Error adding magnet download:', error);
          showError('Error', 'No se pudo añadir la descarga');
        }
      };

      ipcRenderer.on('magnet-received', handleMagnetReceived);

      ipcRenderer.on('magnet-received', handleMagnetReceived);

      return () => {
        ipcRenderer.removeListener('magnet-received', handleMagnetReceived);
      };
    }
  }, []);

  // Mouse navigation (Back/Forward)
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Button 3: Back (Mouse4)
      if (e.button === 3) {
        e.preventDefault();
        window.history.back(); // keep window history for robustness
        useUIStore.getState().goBack();
      }
      // Button 4: Forward (Mouse5)
      else if (e.button === 4) {
        e.preventDefault();
        window.history.forward(); // keep window history for robustness
        useUIStore.getState().goForward();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Manage body class for overlay transparency
  useEffect(() => {
    if (currentPage === 'overlay') {
      document.body.classList.add('overlay-mode');
    } else {
      document.body.classList.remove('overlay-mode');
    }
  }, [currentPage]);

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
        return wrapPage('downloads', <Downloads />);
      case 'achievements':
        return wrapPage('achievements', <Achievements />);
      case 'mods':
        return wrapPage('mods', <PlaceholderPage title="Mod Manager" description="Instala y gestiona mods para tus juegos favoritos" />);
      case 'cloud':
        return wrapPage('cloud', <Cloud />);
      case 'game-details':
        return wrapPage('game-details', <GameDetails />);
      case 'overlay':
        return wrapPage('overlay', <Overlay />);
      case 'astra':
        return wrapPage('astra', <Astra />);
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

  if (currentPage === 'overlay') {
    return (
      <div className="app overlay-mode">
        <main className="overlay-content-wrapper">
          <AnimatePresence mode="wait">
            {renderPage()}
          </AnimatePresence>
        </main>
        <NotificationToast />
      </div>
    );
  }

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

      {/* Global Edit Game Modal */}
      <AnimatePresence>
        {modalOpen === 'edit-game' && selectedGame && (
          <EditGameModal
            game={selectedGame}
            onClose={() => { closeModal(); setSelectedGame(null); }}
          />
        )}
      </AnimatePresence>

      <NotificationToast />

      {/* Global Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirmModal}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
}

export default App;
