import 'dotenv/config';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { emailService } from './emailService.js';
import { steamService } from './steamService.js';
import { steamLocalService } from './steamLocalService.js';
import { launchersService } from './launchersService.js';
import { torrentService } from './torrentService.js';
import { repackSearchService } from './repackSearchService.js';
import { epicService } from './epicService.js';
import { epicAuthService } from './epicAuthService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize electron store
const store = new Store({
  name: 'orbit-data',
  defaults: {
    games: [],
    profile: {
      username: 'Jugador',
      avatar: null,
      status: 'online',
      currentGame: null,
      stats: {
        gamesCompleted: 0,
        totalPlaytime: 0,
        favoriteGenre: null
      }
    },
    settings: {
      theme: 'dark',
      language: 'es',
      notifications: true,
      autoSync: true,
      launchAtStartup: false
    },
    achievements: [],
    tags: ['Favoritos', 'Por jugar', 'Completados', 'Multijugador'],
    epicKeys: {
      clientId: null,
      clientSecret: null
    }
  }
});

let mainWindow;
let pendingMagnetUri = null; // Store magnet URI until window is ready

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

// ==========================================
// MAGNET PROTOCOL HANDLER
// ==========================================

// Register as default handler for magnet: links
if (process.defaultApp) {
  // Development: need to pass the script path
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('magnet', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  // Production
  app.setAsDefaultProtocolClient('magnet');
}

// Check if a magnet URI was passed via command line (first launch)
function extractMagnetFromArgs(args) {
  for (const arg of args) {
    if (arg.startsWith('magnet:')) {
      return arg;
    }
  }
  return null;
}

// Handle magnet URI - add to downloads
function handleMagnetUri(magnetUri) {
  console.log('Received magnet URI:', magnetUri);

  if (!mainWindow || mainWindow.isDestroyed()) {
    // Window not ready yet, store for later
    pendingMagnetUri = magnetUri;
    return;
  }

  // Send to renderer to handle the download
  mainWindow.webContents.send('magnet-received', magnetUri);

  // Focus the window
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

// Single instance lock - prevent multiple instances and handle protocol
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Handle second instance (when clicking magnet link while app is running)
  app.on('second-instance', (event, commandLine) => {
    const magnetUri = extractMagnetFromArgs(commandLine);
    if (magnetUri) {
      handleMagnetUri(magnetUri);
    }

    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Windows: Handle protocol when app is launched via magnet link
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('magnet:')) {
    handleMagnetUri(url);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    icon: path.join(__dirname, '../public/icon.png')
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // DevTools: Presiona F12 o Ctrl+Shift+I para abrir manualmente
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Initialize torrent service with main window
  torrentService.setMainWindow(mainWindow);

  // When window is ready, check for pending magnet or command line args
  mainWindow.webContents.on('did-finish-load', () => {
    // Check command line args for magnet (first launch scenario)
    const magnetFromArgs = extractMagnetFromArgs(process.argv);
    if (magnetFromArgs) {
      handleMagnetUri(magnetFromArgs);
    }

    // Process any pending magnet URI
    if (pendingMagnetUri) {
      handleMagnetUri(pendingMagnetUri);
      pendingMagnetUri = null;
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    torrentService.destroy();
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for window controls
ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

// IPC Handlers for data persistence
ipcMain.handle('get-games', () => {
  return store.get('games');
});

ipcMain.handle('save-games', (_, games) => {
  store.set('games', games);
  return true;
});

ipcMain.handle('get-profile', () => {
  return store.get('profile');
});

ipcMain.handle('save-profile', (_, profile) => {
  store.set('profile', profile);
  return true;
});

ipcMain.handle('get-settings', () => {
  return store.get('settings');
});

ipcMain.handle('save-settings', (_, settings) => {
  store.set('settings', settings);
  return true;
});

ipcMain.handle('get-achievements', () => {
  return store.get('achievements');
});

ipcMain.handle('save-achievements', (_, achievements) => {
  store.set('achievements', achievements);
  return true;
});

ipcMain.handle('get-tags', () => {
  return store.get('tags');
});

ipcMain.handle('save-tags', (_, tags) => {
  store.set('tags', tags);
  return true;
});

// Launch game
ipcMain.handle('launch-game', async (_, executablePath) => {
  try {
    await shell.openPath(executablePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open external URL
ipcMain.on('open-external', (_, url) => {
  shell.openExternal(url);
});

// Email Service Handlers
ipcMain.handle('send-welcome-email', async (_, { email, username }) => {
  return await emailService.sendWelcomeEmail(email, username);
});

ipcMain.handle('send-verification-email', async (_, { email, username }) => {
  return await emailService.sendVerificationEmail(email, username);
});

ipcMain.handle('verify-email-code', (_, { email, code }) => {
  return emailService.verifyCode(email, code);
});

ipcMain.handle('resend-verification-email', async (_, { email, username }) => {
  return await emailService.resendVerificationEmail(email, username);
});

// Steam API Handlers
ipcMain.handle('steam-get-owned-games', async (_, steamId) => {
  return await steamService.getOwnedGames(steamId);
});

ipcMain.handle('steam-get-player-summary', async (_, steamId) => {
  return await steamService.getPlayerSummary(steamId);
});

ipcMain.handle('steam-resolve-vanity-url', async (_, vanityName) => {
  return await steamService.resolveVanityURL(vanityName);
});

ipcMain.handle('steam-get-recently-played', async (_, steamId) => {
  return await steamService.getRecentlyPlayedGames(steamId);
});

ipcMain.handle('steam-get-achievements', async (_, { steamId, appId }) => {
  return await steamService.getPlayerAchievements(steamId, appId);
});

ipcMain.handle('steam-get-player-count', async (_, appId) => {
  return await steamService.getCurrentPlayerCount(appId);
});

// Steam OpenID Authentication
ipcMain.handle('steam-openid-login', async () => {
  const { steamAuthService } = await import('./steamAuthService.js');
  return await steamAuthService.startSteamAuth();
});

// Steam Level
ipcMain.handle('steam-get-level', async (_, steamId) => {
  return await steamService.getSteamLevel(steamId);
});

// Steam Badges
ipcMain.handle('steam-get-badges', async (_, steamId) => {
  return await steamService.getSteamBadges(steamId);
});

// Steam Friends
ipcMain.handle('steam-get-friends', async (_, steamId) => {
  return await steamService.getFriendsWithStatus(steamId);
});


// Steam Local Service Handlers
ipcMain.handle('steam-get-local-info', async () => {
  return await steamLocalService.getSteamInfo();
});

ipcMain.handle('steam-launch-game', async (_, appId) => {
  try {
    await steamLocalService.launchSteamGame(appId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('steam-install-game', async (_, appId) => {
  try {
    await steamLocalService.installSteamGame(appId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('steam-open-store', async (_, appId) => {
  try {
    await steamLocalService.openStorePage(appId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('steam-open-login', async () => {
  try {
    await steamLocalService.openSteamLogin();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Multi-Platform Launcher Handlers

// Get all launchers info at once
ipcMain.handle('launchers-get-all-info', async () => {
  return await launchersService.getAllLaunchersInfo();
});

// Epic Games
ipcMain.handle('epic-get-info', async () => {
  return await launchersService.getEpicInfo();
});

ipcMain.handle('epic-launch-game', async (_, appName) => {
  try {
    await launchersService.launchEpicGame(appName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// New Epic Web API Handlers
ipcMain.handle('epic-set-api-keys', (_, { clientId, clientSecret }) => {
  store.set('epicKeys', { clientId, clientSecret });
  return { success: true };
});

ipcMain.handle('epic-get-api-keys', () => {
  return store.get('epicKeys');
});

ipcMain.handle('epic-login', async () => {
  const keys = store.get('epicKeys');
  if (!keys || !keys.clientId || !keys.clientSecret) {
    return { success: false, error: 'Credenciales de Epic no configuradas. Por favor, añádelas en Configuración.' };
  }
  return await epicAuthService.startEpicAuth(keys.clientId, keys.clientSecret);
});

ipcMain.handle('epic-get-player-summary', async (_, { accessToken, accountId }) => {
  return await epicService.getPlayerSummary(accessToken, accountId);
});

ipcMain.handle('epic-get-owned-games', async (_, { accessToken, accountId }) => {
  return await epicService.getOwnedGames(accessToken, accountId);
});

ipcMain.handle('epic-get-friends', async (_, { accessToken, accountId }) => {
  return await epicService.getFriendsWithStatus(accessToken, accountId);
});

ipcMain.handle('epic-get-achievements', async (_, { accessToken, accountId, namespace, appId }) => {
  return await epicService.getPlayerAchievements(accessToken, accountId, namespace, appId);
});

// GOG Galaxy
ipcMain.handle('gog-get-info', async () => {
  return await launchersService.getGogInfo();
});

ipcMain.handle('gog-launch-game', async (_, gameId) => {
  try {
    await launchersService.launchGogGame(gameId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// EA App
ipcMain.handle('ea-get-info', async () => {
  return await launchersService.getEaInfo();
});

ipcMain.handle('ea-launch-game', async (_, gameId) => {
  try {
    await launchersService.launchEaGame(gameId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Ubisoft Connect
ipcMain.handle('ubisoft-get-info', async () => {
  return await launchersService.getUbisoftInfo();
});

ipcMain.handle('ubisoft-launch-game', async (_, gameId) => {
  try {
    await launchersService.launchUbisoftGame(gameId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Generic launcher - launch game from any platform
ipcMain.handle('launcher-launch-game', async (_, { platform, gameId }) => {
  try {
    await launchersService.launchGame(platform, gameId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open game installation directory
ipcMain.handle('open-game-directory', async (_, directoryPath) => {
  try {
    await shell.openPath(directoryPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Show file in explorer
ipcMain.handle('show-in-explorer', async (_, filePath) => {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ==========================================
// TORRENT SERVICE HANDLERS
// ==========================================

// Add a new torrent download
ipcMain.handle('torrent-add', async (_, { id, magnetUri, name }) => {
  try {
    return await torrentService.addTorrent({ id, magnetUri, name });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get all downloads
ipcMain.handle('torrent-get-all', () => {
  return torrentService.getAllDownloads();
});

// Pause a torrent
ipcMain.handle('torrent-pause', (_, id) => {
  return torrentService.pauseTorrent(id);
});

// Resume a torrent
ipcMain.handle('torrent-resume', (_, id) => {
  return torrentService.resumeTorrent(id);
});

// Cancel a torrent
ipcMain.handle('torrent-cancel', (_, id) => {
  return torrentService.cancelTorrent(id);
});

// Get download path
ipcMain.handle('torrent-get-path', () => {
  return torrentService.getDownloadPath();
});

// Set download path
ipcMain.handle('torrent-set-path', (_, newPath) => {
  torrentService.setDownloadPath(newPath);
  return { success: true };
});

// ==========================================
// REPACK SEARCH SERVICE HANDLERS
// ==========================================

// Search repacks from FitGirl, DODI, ElAmigos
ipcMain.handle('repacks-search', async (_, query) => {
  try {
    return await repackSearchService.searchRepacks(query);
  } catch (error) {
    console.error('Error searching repacks:', error);
    return [];
  }
});

// Get magnet link for a specific repack
ipcMain.handle('repacks-get-magnet', async (_, { source, postUrl }) => {
  try {
    const magnet = await repackSearchService.getMagnetLink(source, postUrl);
    if (magnet && magnet.startsWith('magnet:')) {
      return { success: true, magnet };
    }
    return { success: false, error: 'No se encontró enlace magnet' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
