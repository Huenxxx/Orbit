import WebTorrent from 'webtorrent';
import path from 'path';
import { app } from 'electron';
import Store from 'electron-store';

// Get localappdata path for downloads
const getDefaultDownloadPath = () => {
    const localAppData = process.env.LOCALAPPDATA || app.getPath('userData');
    return path.join(localAppData, 'Orbit', 'Games');
};

// Store for persisting downloads
const downloadsStore = new Store({
    name: 'orbit-downloads',
    defaults: {
        downloads: [],
        downloadPath: getDefaultDownloadPath()
    }
});

// Additional trackers for better peer discovery
const EXTRA_TRACKERS = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.bittor.pw:1337/announce',
    'udp://public.popcorn-tracker.org:6969/announce',
    'udp://tracker.dler.org:6969/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://open.demonii.com:1337/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://explodie.org:6969/announce',
    'udp://tracker1.bt.moack.co.kr:80/announce',
    'udp://tracker.theoks.net:6969/announce',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.webtorrent.dev'
];

// WebTorrent client
let client = null;
let mainWindow = null;

// Active downloads map
const activeDownloads = new Map();

// Progress intervals map
const progressIntervals = new Map();

// Initialize WebTorrent client with optimized settings
function initClient() {
    if (!client) {
        client = new WebTorrent({
            maxConns: 100,
            dht: true,
            lsd: true,
            utp: true,
            webSeeds: true,
            tracker: {
                announce: EXTRA_TRACKERS
            }
        });

        client.on('error', (err) => {
            console.error('WebTorrent error:', err);
        });
    }
    return client;
}

// Set main window for IPC communication
function setMainWindow(window) {
    mainWindow = window;
}

// Get download path
function getDownloadPath() {
    return downloadsStore.get('downloadPath');
}

// Set download path
function setDownloadPath(newPath) {
    downloadsStore.set('downloadPath', newPath);
}

// Get all saved downloads
function getDownloads() {
    return downloadsStore.get('downloads') || [];
}

// Save downloads to store
function saveDownloads(downloads) {
    downloadsStore.set('downloads', downloads);
}

// Add a new torrent download
async function addTorrent({ id, magnetUri, name }) {
    initClient();

    const downloadPath = getDownloadPath();

    // Check if torrent already exists
    const existingTorrent = client.get(magnetUri);
    if (existingTorrent) {
        console.log('Torrent already exists, using existing');
        activeDownloads.set(id, existingTorrent);
        setupTorrentListeners(id, existingTorrent);
        return { success: true, torrentId: id };
    }

    return new Promise((resolve, reject) => {
        try {
            // Add extra trackers to magnet
            let enhancedMagnet = magnetUri;
            EXTRA_TRACKERS.forEach(tracker => {
                if (!enhancedMagnet.includes(encodeURIComponent(tracker))) {
                    enhancedMagnet += `&tr=${encodeURIComponent(tracker)}`;
                }
            });

            const torrent = client.add(enhancedMagnet, {
                path: downloadPath,
                announce: EXTRA_TRACKERS
            }, (torrent) => {
                console.log('Torrent added:', torrent.name);
                console.log('Peers:', torrent.numPeers);

                activeDownloads.set(id, torrent);

                // Save to store
                const downloads = getDownloads();
                const existingIndex = downloads.findIndex(d => d.id === id);
                const downloadData = {
                    id,
                    name: name || torrent.name,
                    magnetUri,
                    progress: 0,
                    downloadSpeed: 0,
                    uploadSpeed: 0,
                    downloaded: 0,
                    totalSize: torrent.length,
                    status: 'downloading',
                    peers: 0,
                    seeds: 0,
                    createdAt: new Date().toISOString(),
                    savePath: path.join(downloadPath, torrent.name)
                };

                if (existingIndex >= 0) {
                    downloads[existingIndex] = downloadData;
                } else {
                    downloads.push(downloadData);
                }
                saveDownloads(downloads);

                setupTorrentListeners(id, torrent);

                resolve({ success: true, torrentId: id });
            });

            torrent.on('error', (err) => {
                console.error('Torrent error:', err);
                updateDownloadStatus(id, 'error', err.message);
                reject(err);
            });

        } catch (error) {
            console.error('Error adding torrent:', error);
            reject(error);
        }
    });
}

// Setup listeners for torrent progress
function setupTorrentListeners(id, torrent) {
    // Clear any existing interval
    if (progressIntervals.has(id)) {
        clearInterval(progressIntervals.get(id));
    }

    const progressInterval = setInterval(() => {
        if (!torrent || torrent.destroyed) {
            clearInterval(progressInterval);
            progressIntervals.delete(id);
            return;
        }

        const progress = Math.round(torrent.progress * 100 * 10) / 10;

        // Send progress to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('torrent-progress', {
                id,
                progress,
                downloadSpeed: torrent.downloadSpeed,
                uploadSpeed: torrent.uploadSpeed,
                downloaded: torrent.downloaded,
                totalSize: torrent.length,
                peers: torrent.numPeers,
                seeds: torrent.numPeers,
                eta: torrent.timeRemaining ? Math.round(torrent.timeRemaining / 1000) : null
            });
        }

        // Update store periodically
        updateDownloadProgress(id, {
            progress,
            downloadSpeed: torrent.downloadSpeed,
            uploadSpeed: torrent.uploadSpeed,
            downloaded: torrent.downloaded,
            totalSize: torrent.length,
            peers: torrent.numPeers
        });

    }, 1000);

    progressIntervals.set(id, progressInterval);

    // Torrent complete
    torrent.on('done', () => {
        clearInterval(progressInterval);
        progressIntervals.delete(id);
        console.log('Torrent complete:', torrent.name);

        const savePath = path.join(getDownloadPath(), torrent.name);

        updateDownloadStatus(id, 'completed');

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('torrent-complete', {
                id,
                savePath
            });
        }

        const downloads = getDownloads();
        const download = downloads.find(d => d.id === id);
        if (download) {
            download.status = 'completed';
            download.progress = 100;
            download.completedAt = new Date().toISOString();
            download.savePath = savePath;
            saveDownloads(downloads);
        }
    });

    torrent.on('error', (err) => {
        clearInterval(progressInterval);
        progressIntervals.delete(id);
        console.error('Torrent error:', err);
        updateDownloadStatus(id, 'error', err.message);

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('torrent-error', {
                id,
                error: err.message
            });
        }
    });
}

// Update download progress in store
function updateDownloadProgress(id, data) {
    const downloads = getDownloads();
    const download = downloads.find(d => d.id === id);
    if (download && download.status !== 'paused') {
        Object.assign(download, data);
        download.status = 'downloading';
        saveDownloads(downloads);
    }
}

// Update download status
function updateDownloadStatus(id, status, error = null) {
    const downloads = getDownloads();
    const download = downloads.find(d => d.id === id);
    if (download) {
        download.status = status;
        if (error) download.error = error;
        saveDownloads(downloads);
    }
}

// Pause torrent
function pauseTorrent(id) {
    const torrent = activeDownloads.get(id);
    if (torrent && !torrent.destroyed) {
        torrent.pause();

        // Stop progress updates
        if (progressIntervals.has(id)) {
            clearInterval(progressIntervals.get(id));
            progressIntervals.delete(id);
        }

        updateDownloadStatus(id, 'paused');
        return { success: true };
    }
    return { success: false, error: 'Torrent not found' };
}

// Resume torrent
function resumeTorrent(id) {
    const torrent = activeDownloads.get(id);
    if (torrent && !torrent.destroyed) {
        torrent.resume();
        setupTorrentListeners(id, torrent);
        updateDownloadStatus(id, 'downloading');
        return { success: true };
    }

    // Try to re-add from store
    const downloads = getDownloads();
    const download = downloads.find(d => d.id === id);
    if (download && download.magnetUri) {
        addTorrent({ id, magnetUri: download.magnetUri, name: download.name });
        return { success: true };
    }

    return { success: false, error: 'Torrent not found' };
}

// Cancel torrent
function cancelTorrent(id) {
    const torrent = activeDownloads.get(id);
    if (torrent) {
        torrent.destroy();
        activeDownloads.delete(id);
    }

    // Stop progress updates
    if (progressIntervals.has(id)) {
        clearInterval(progressIntervals.get(id));
        progressIntervals.delete(id);
    }

    // Remove from store
    const downloads = getDownloads();
    const filtered = downloads.filter(d => d.id !== id);
    saveDownloads(filtered);

    return { success: true };
}

// Get all downloads
function getAllDownloads() {
    return getDownloads();
}

// Destroy client on app quit
function destroy() {
    // Clear all intervals
    progressIntervals.forEach((interval) => clearInterval(interval));
    progressIntervals.clear();

    if (client) {
        client.destroy();
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
