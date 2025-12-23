import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

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
