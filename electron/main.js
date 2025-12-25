import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';
import { emailService } from './emailService.js';
import { steamService } from './steamService.js';
import { steamLocalService } from './steamLocalService.js';
import { launchersService } from './launchersService.js';

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
    tags: ['Favoritos', 'Por jugar', 'Completados', 'Multijugador']
  }
});

let mainWindow;

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

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
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
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
