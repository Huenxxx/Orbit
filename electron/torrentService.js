import WebTorrent from 'webtorrent';
import path from 'path';
import { app } from 'electron';
import Store from 'electron-store';
import fs from 'fs';

// Get AppData path for downloads
const getDefaultDownloadPath = () => {
    const localAppData = process.env.LOCALAPPDATA || app.getPath('userData');
    const gamesPath = path.join(localAppData, 'Orbit', 'Games');

    // Create directory if it doesn't exist
    if (!fs.existsSync(gamesPath)) {
        fs.mkdirSync(gamesPath, { recursive: true });
    }

    return gamesPath;
};

// Store for persisting downloads
const downloadsStore = new Store({
    name: 'orbit-downloads',
    defaults: {
        downloads: []
    }
});

// Enhanced trackers for maximum peer discovery
const EXTRA_TRACKERS = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://explodie.org:6969/announce',
    'udp://tracker.dler.org:6969/announce',
    'udp://open.demonii.com:1337/announce',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.webtorrent.dev'
];

// WebTorrent client
let client = null;
let mainWindow = null;

// Active downloads map (id -> torrent)
const activeDownloads = new Map();

// Progress intervals map
const progressIntervals = new Map();

// Initialize WebTorrent client
function initClient() {
    if (!client) {
        client = new WebTorrent({
            maxConns: 100,
            dht: true,
            lsd: true,
            utp: true,
            webSeeds: true
        });

        client.on('error', (err) => {
            console.error('WebTorrent client error:', err.message);
        });
    }
    return client;
}

// Set main window for IPC communication
function setMainWindow(window) {
    mainWindow = window;
    console.log('Torrent service: mainWindow set successfully', mainWindow ? 'YES' : 'NO');
}

// Get download path - always use AppData
function getDownloadPath() {
    return getDefaultDownloadPath();
}

// Set download path (not used - always AppData)
function setDownloadPath() {
    console.log('Downloads always go to:', getDefaultDownloadPath());
}

// Get all saved downloads
function getDownloads() {
    return downloadsStore.get('downloads') || [];
}

// Save downloads to store
function saveDownloads(downloads) {
    downloadsStore.set('downloads', downloads);
}

// Update download progress in store
function updateDownloadProgress(id, data) {
    const downloads = getDownloads();
    const index = downloads.findIndex(d => d.id === id);
    if (index >= 0) {
        downloads[index] = { ...downloads[index], ...data };
        saveDownloads(downloads);
    }
}

// Update download status
function updateDownloadStatus(id, status, error = null) {
    const downloads = getDownloads();
    const index = downloads.findIndex(d => d.id === id);
    if (index >= 0) {
        downloads[index].status = status;
        if (error) downloads[index].error = error;
        if (status === 'completed') downloads[index].completedAt = new Date().toISOString();
        saveDownloads(downloads);
    }
}

// Add a new torrent download
async function addTorrent({ id, magnetUri, name }) {
    initClient();

    const downloadPath = getDownloadPath();

    return new Promise((resolve) => {
        try {
            // Add extra trackers to magnet
            let enhancedMagnet = magnetUri;
            EXTRA_TRACKERS.forEach(tracker => {
                if (!enhancedMagnet.includes(encodeURIComponent(tracker))) {
                    enhancedMagnet += `&tr=${encodeURIComponent(tracker)}`;
                }
            });

            console.log('Adding torrent:', name || 'Unknown');

            const torrent = client.add(enhancedMagnet, {
                path: downloadPath,
                announce: EXTRA_TRACKERS
            });

            // Store immediately
            activeDownloads.set(id, torrent);

            // Save initial download data
            const downloads = getDownloads();
            const existingIndex = downloads.findIndex(d => d.id === id);
            const downloadData = {
                id,
                name: name || 'Descargando...',
                magnetUri,
                progress: 0,
                downloadSpeed: 0,
                uploadSpeed: 0,
                downloaded: 0,
                totalSize: 0,
                status: 'downloading',
                peers: 0,
                seeds: 0,
                createdAt: new Date().toISOString(),
                savePath: downloadPath
            };

            if (existingIndex >= 0) {
                downloads[existingIndex] = downloadData;
            } else {
                downloads.push(downloadData);
            }
            saveDownloads(downloads);

            // Setup event handlers
            torrent.on('metadata', () => {
                console.log('Torrent metadata received:', torrent.name);
                updateDownloadProgress(id, {
                    name: name || torrent.name,
                    totalSize: torrent.length,
                    savePath: path.join(downloadPath, torrent.name)
                });
            });

            torrent.on('ready', () => {
                console.log('Torrent ready:', torrent.name);
            });

            torrent.on('done', () => {
                console.log('Torrent complete:', torrent.name);
                const savePath = path.join(downloadPath, torrent.name || 'download');

                updateDownloadStatus(id, 'completed');

                // Stop progress interval
                if (progressIntervals.has(id)) {
                    clearInterval(progressIntervals.get(id));
                    progressIntervals.delete(id);
                }

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('torrent-complete', { id, savePath });
                }
            });

            torrent.on('error', (err) => {
                console.error('Torrent error:', err.message);
                updateDownloadStatus(id, 'error', err.message);

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('torrent-error', { id, error: err.message });
                }
            });

            // Start progress polling
            const progressInterval = setInterval(() => {
                if (!torrent || torrent.done) {
                    clearInterval(progressInterval);
                    progressIntervals.delete(id);
                    return;
                }

                const progress = Math.round(torrent.progress * 100 * 10) / 10;

                const updates = {
                    progress,
                    downloadSpeed: torrent.downloadSpeed || 0,
                    uploadSpeed: torrent.uploadSpeed || 0,
                    downloaded: torrent.downloaded || 0,
                    totalSize: torrent.length || 0,
                    peers: torrent.numPeers || 0
                };

                updateDownloadProgress(id, updates);

                if (mainWindow && !mainWindow.isDestroyed()) {
                    console.log('Sending progress:', id, progress + '%', (torrent.downloadSpeed / 1024 / 1024).toFixed(2) + ' MB/s');
                    mainWindow.webContents.send('torrent-progress', {
                        id,
                        ...updates,
                        seeds: torrent.numPeers || 0,
                        eta: torrent.timeRemaining ? Math.round(torrent.timeRemaining / 1000) : null
                    });
                } else {
                    console.log('mainWindow not available for progress update');
                }
            }, 1000);

            progressIntervals.set(id, progressInterval);

            resolve({ success: true, torrentId: id });

        } catch (error) {
            console.error('Error adding torrent:', error);
            updateDownloadStatus(id, 'error', error.message);
            resolve({ success: false, error: error.message });
        }
    });
}

// Pause torrent
function pauseTorrent(id) {
    console.log('Pausing torrent:', id);
    const torrent = activeDownloads.get(id);
    if (torrent && typeof torrent.pause === 'function') {
        torrent.pause();
        updateDownloadStatus(id, 'paused');

        // Stop progress interval
        if (progressIntervals.has(id)) {
            clearInterval(progressIntervals.get(id));
            progressIntervals.delete(id);
        }

        return { success: true };
    }
    return { success: false, error: 'Torrent not found' };
}

// Resume torrent
function resumeTorrent(id) {
    console.log('Resuming torrent:', id);
    const torrent = activeDownloads.get(id);
    if (torrent && typeof torrent.resume === 'function') {
        torrent.resume();
        updateDownloadStatus(id, 'downloading');
        return { success: true };
    }
    return { success: false, error: 'Torrent not found' };
}

// Cancel/remove torrent
function cancelTorrent(id) {
    console.log('Cancelling torrent:', id);

    // Stop progress interval
    if (progressIntervals.has(id)) {
        clearInterval(progressIntervals.get(id));
        progressIntervals.delete(id);
    }

    // Destroy torrent if exists
    const torrent = activeDownloads.get(id);
    if (torrent) {
        try {
            if (typeof torrent.destroy === 'function') {
                torrent.destroy();
            }
        } catch (e) {
            console.error('Error destroying torrent:', e.message);
        }
        activeDownloads.delete(id);
    }

    // Remove from store
    const downloads = getDownloads();
    const filtered = downloads.filter(d => d.id !== id);
    saveDownloads(filtered);

    console.log('Torrent cancelled successfully');
    return { success: true };
}

// Get all downloads
function getAllDownloads() {
    return getDownloads();
}

// Destroy client on app quit
function destroy() {
    console.log('Destroying torrent service...');

    // Clear all intervals
    progressIntervals.forEach((interval) => clearInterval(interval));
    progressIntervals.clear();

    // Clear active downloads
    activeDownloads.clear();

    if (client) {
        try {
            client.destroy();
        } catch (e) {
            console.error('Error destroying client:', e.message);
        }
        client = null;
    }
}

export const torrentService = {
    initClient,
    setMainWindow,
    addTorrent,
    pauseTorrent,
    resumeTorrent,
    cancelTorrent,
    getAllDownloads,
    getDownloadPath,
    setDownloadPath,
    destroy
};
