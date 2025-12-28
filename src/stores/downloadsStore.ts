import { create } from 'zustand';

// Download status types
export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error' | 'seeding';

// Download item interface
export interface DownloadItem {
    id: string;
    gameId?: string;
    name: string;
    magnetUri?: string;
    imageUrl?: string;
    progress: number; // 0-100
    downloadSpeed: number; // bytes per second
    uploadSpeed: number; // bytes per second
    downloaded: number; // bytes
    totalSize: number; // bytes
    status: DownloadStatus;
    peers: number;
    seeds: number;
    eta?: number; // seconds remaining
    savePath?: string;
    error?: string;
    createdAt: string;
    completedAt?: string;
}

// Repack source for search
export interface RepackSource {
    id: string;
    name: string;
    magnetUri?: string | null;
    postUrl?: string;
    size: string;
    uploadDate?: string;
    source?: string;
}

interface DownloadsState {
    downloads: DownloadItem[];
    isLoading: boolean;
    activeDownloads: number;

    // Actions
    addDownload: (name: string, magnetUri: string, imageUrl?: string, gameId?: string) => Promise<string>;
    removeDownload: (id: string) => void;
    pauseDownload: (id: string) => Promise<void>;
    resumeDownload: (id: string) => Promise<void>;
    cancelDownload: (id: string) => Promise<void>;
    updateDownload: (id: string, updates: Partial<DownloadItem>) => void;
    loadDownloads: () => Promise<void>;
    clearCompleted: () => void;

    // Search repacks
    searchRepacks: (query: string) => Promise<RepackSource[]>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
    downloads: [],
    isLoading: false,
    activeDownloads: 0,

    addDownload: async (name, magnetUri, imageUrl, gameId) => {
        const id = `download_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newDownload: DownloadItem = {
            id,
            gameId,
            name,
            magnetUri,
            imageUrl,
            progress: 0,
            downloadSpeed: 0,
            uploadSpeed: 0,
            downloaded: 0,
            totalSize: 0,
            status: 'queued',
            peers: 0,
            seeds: 0,
            createdAt: new Date().toISOString()
        };

        set(state => ({
            downloads: [newDownload, ...state.downloads],
            activeDownloads: state.activeDownloads + 1
        }));

        // Start the download via Electron (WebTorrent)
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                const result = await ipcRenderer.invoke('torrent-add', { id, magnetUri, name });

                if (!result.success) {
                    console.error('Torrent error:', result.error);
                    get().updateDownload(id, {
                        status: 'error',
                        error: result.error || 'Error al iniciar descarga'
                    });
                }
            }
        } catch (error: any) {
            console.error('Error starting download:', error);
            get().updateDownload(id, {
                status: 'error',
                error: error.message || 'No se pudo iniciar la descarga'
            });
        }

        return id;
    },

    removeDownload: (id) => {
        const download = get().downloads.find(d => d.id === id);
        set(state => ({
            downloads: state.downloads.filter(d => d.id !== id),
            activeDownloads: download?.status === 'downloading' || download?.status === 'queued'
                ? Math.max(0, state.activeDownloads - 1)
                : state.activeDownloads
        }));
    },

    pauseDownload: async (id) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                await ipcRenderer.invoke('torrent-pause', id);
            }
            get().updateDownload(id, { status: 'paused' });
        } catch (error) {
            console.error('Error pausing download:', error);
        }
    },

    resumeDownload: async (id) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                await ipcRenderer.invoke('torrent-resume', id);
            }
            get().updateDownload(id, { status: 'downloading' });
        } catch (error) {
            console.error('Error resuming download:', error);
        }
    },

    cancelDownload: async (id) => {
        // Remove from UI immediately for responsiveness
        get().removeDownload(id);

        // Then try to cancel in backend
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                await ipcRenderer.invoke('torrent-cancel', id);
            }
        } catch (error) {
            console.error('Error cancelling download in backend:', error);
            // Already removed from UI, so no need to do anything else
        }
    },

    updateDownload: (id, updates) => {
        set(state => ({
            downloads: state.downloads.map(d =>
                d.id === id ? { ...d, ...updates } : d
            )
        }));

        // Update active downloads count
        if (updates.status === 'completed' || updates.status === 'error') {
            set(state => ({
                activeDownloads: Math.max(0, state.activeDownloads - 1)
            }));
        }
    },

    loadDownloads: async () => {
        set({ isLoading: true });
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                const backendDownloads = await ipcRenderer.invoke('torrent-get-all');
                if (backendDownloads && Array.isArray(backendDownloads)) {
                    // Merge with existing local downloads to avoid losing newly added ones
                    set(state => {
                        const merged = [...state.downloads];

                        // Update existing and add new from backend
                        backendDownloads.forEach((bd: DownloadItem) => {
                            const existingIndex = merged.findIndex(d => d.id === bd.id);
                            if (existingIndex >= 0) {
                                // Update with backend data (more accurate)
                                merged[existingIndex] = { ...merged[existingIndex], ...bd };
                            } else {
                                // Add new download from backend
                                merged.push(bd);
                            }
                        });

                        return {
                            downloads: merged,
                            activeDownloads: merged.filter(
                                d => d.status === 'downloading' || d.status === 'queued'
                            ).length
                        };
                    });
                }
            }
        } catch (error) {
            console.error('Error loading downloads:', error);
        } finally {
            set({ isLoading: false });
        }
    },

    clearCompleted: () => {
        set(state => ({
            downloads: state.downloads.filter(d => d.status !== 'completed')
        }));
    },

    // Search repacks from FitGirl, DODI, ElAmigos
    searchRepacks: async (query) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                const results = await ipcRenderer.invoke('repacks-search', query);
                return results || [];
            }
            return [];
        } catch (error) {
            console.error('Error searching repacks:', error);
            return [];
        }
    }
}));

// Setup IPC listeners for download updates
if (typeof window !== 'undefined' && electronRequire) {
    try {
        const { ipcRenderer } = electronRequire('electron');

        // Listen for download progress updates
        ipcRenderer?.on('torrent-progress', (_event: any, data: {
            id: string;
            progress: number;
            downloadSpeed: number;
            uploadSpeed: number;
            downloaded: number;
            totalSize: number;
            peers: number;
            seeds: number;
            eta: number;
        }) => {
            console.log('Progress update:', data.id, data.progress + '%', (data.downloadSpeed / 1024 / 1024).toFixed(2) + ' MB/s');
            useDownloadsStore.getState().updateDownload(data.id, {
                progress: data.progress,
                downloadSpeed: data.downloadSpeed,
                uploadSpeed: data.uploadSpeed,
                downloaded: data.downloaded,
                totalSize: data.totalSize,
                peers: data.peers,
                seeds: data.seeds,
                eta: data.eta,
                status: 'downloading'
            });
        });

        // Listen for download completion
        ipcRenderer?.on('torrent-complete', (_event: any, data: { id: string; savePath: string }) => {
            useDownloadsStore.getState().updateDownload(data.id, {
                status: 'completed',
                progress: 100,
                completedAt: new Date().toISOString(),
                savePath: data.savePath
            });
        });

        // Listen for download errors
        ipcRenderer?.on('torrent-error', (_event: any, data: { id: string; error: string }) => {
            useDownloadsStore.getState().updateDownload(data.id, {
                status: 'error',
                error: data.error
            });
        });
    } catch (error) {
        console.error('Error setting up IPC listeners:', error);
    }
}
