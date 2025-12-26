import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    Pause,
    Play,
    Trash2,
    Search,
    Link2,
    Check,
    X,
    Clock,
    ArrowUpCircle,
    ArrowDownCircle,
    Users,
    HardDrive,
    Loader2,
    AlertCircle,
    FolderOpen,
    RefreshCw
} from 'lucide-react';
import { useDownloadsStore, type DownloadItem, type RepackSource } from '../../stores/downloadsStore';
import { useNotificationStore } from '../../stores/notificationStore';
import './Downloads.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const electronRequire = (typeof window !== 'undefined' && (window as any).require) as ((module: string) => any) | undefined;

export function Downloads() {
    const {
        downloads,
        isLoading,
        activeDownloads,
        loadDownloads,
        addDownload,
        pauseDownload,
        resumeDownload,
        cancelDownload,
        clearCompleted,
        searchRepacks
    } = useDownloadsStore();

    const { showSuccess, showError } = useNotificationStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [magnetUri, setMagnetUri] = useState('');
    const [gameName, setGameName] = useState('');

    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<RepackSource[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        loadDownloads();
    }, [loadDownloads]);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSec: number): string => {
        return formatBytes(bytesPerSec) + '/s';
    };

    const formatEta = (seconds: number | undefined): string => {
        if (!seconds || seconds === Infinity) return '--:--:--';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getStatusIcon = (status: DownloadItem['status']) => {
        switch (status) {
            case 'downloading':
                return <ArrowDownCircle size={18} className="status-icon downloading" />;
            case 'paused':
                return <Pause size={18} className="status-icon paused" />;
            case 'completed':
                return <Check size={18} className="status-icon completed" />;
            case 'error':
                return <AlertCircle size={18} className="status-icon error" />;
            case 'seeding':
                return <ArrowUpCircle size={18} className="status-icon seeding" />;
            default:
                return <Clock size={18} className="status-icon queued" />;
        }
    };

    const getStatusLabel = (status: DownloadItem['status']) => {
        switch (status) {
            case 'downloading': return 'Descargando';
            case 'paused': return 'En pausa';
            case 'completed': return 'Completado';
            case 'error': return 'Error';
            case 'seeding': return 'Compartiendo';
            default: return 'En cola';
        }
    };

    const handleAddMagnet = async () => {
        if (!magnetUri.trim()) {
            showError('Error', 'Por favor ingresa un enlace magnet');
            return;
        }

        if (!magnetUri.startsWith('magnet:')) {
            showError('Error', 'El enlace debe comenzar con "magnet:"');
            return;
        }

        try {
            const name = gameName.trim() || 'Descarga sin nombre';
            await addDownload(name, magnetUri);
            showSuccess('Descarga añadida', `${name} ha sido añadido a la cola`);
            setMagnetUri('');
            setGameName('');
            setShowAddModal(false);
        } catch {
            showError('Error', 'No se pudo añadir la descarga');
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await searchRepacks(searchQuery);
            setSearchResults(results);
        } catch {
            showError('Error', 'No se pudo buscar repacks');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectRepack = async (repack: RepackSource) => {
        try {
            let magnetUri = repack.magnetUri;

            // If no magnet URI, fetch it from the post URL
            if (!magnetUri && repack.postUrl && repack.source) {
                showSuccess('Obteniendo enlace', 'Obteniendo enlace de descarga...');

                const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
                if (ipcRenderer) {
                    const result = await ipcRenderer.invoke('repacks-get-magnet', {
                        source: repack.source,
                        postUrl: repack.postUrl
                    });

                    if (result.success && result.magnet) {
                        magnetUri = result.magnet;
                    } else {
                        showError('Error', 'No se pudo obtener el enlace magnet. Intenta visitar la página directamente.');
                        return;
                    }
                }
            }

            if (!magnetUri) {
                showError('Error', 'No se encontró enlace magnet para este repack');
                return;
            }

            await addDownload(repack.name, magnetUri);
            showSuccess('Descarga añadida', `${repack.name} ha sido añadido a la cola`);
            setShowSearchModal(false);
            setSearchQuery('');
            setSearchResults([]);
        } catch {
            showError('Error', 'No se pudo añadir la descarga');
        }
    };

    const handleOpenFolder = async (path: string) => {
        try {
            const { ipcRenderer } = electronRequire ? electronRequire('electron') : { ipcRenderer: null };
            if (ipcRenderer) {
                await ipcRenderer.invoke('open-game-directory', path);
            }
        } catch {
            showError('Error', 'No se pudo abrir la carpeta');
        }
    };

    const completedCount = downloads.filter(d => d.status === 'completed').length;

    return (
        <div className="downloads-page">
            {/* Header */}
            <header className="downloads-header">
                <div className="header-title">
                    <h1>Descargas</h1>
                    {activeDownloads > 0 && (
                        <span className="active-badge">{activeDownloads} activas</span>
                    )}
                </div>

                <div className="header-actions">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowSearchModal(true)}
                    >
                        <Search size={18} />
                        Buscar Repacks
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <Link2 size={18} />
                        Añadir Magnet
                    </button>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="downloads-stats">
                <div className="stat">
                    <Download size={16} />
                    <span>{downloads.length} total</span>
                </div>
                <div className="stat">
                    <ArrowDownCircle size={16} />
                    <span>{activeDownloads} descargando</span>
                </div>
                <div className="stat">
                    <Check size={16} />
                    <span>{completedCount} completados</span>
                </div>
                {completedCount > 0 && (
                    <button className="btn-clear" onClick={clearCompleted}>
                        <Trash2 size={14} />
                        Limpiar completados
                    </button>
                )}
            </div>

            {/* Downloads List */}
            <div className="downloads-content">
                {isLoading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="spinning" />
                        <p>Cargando descargas...</p>
                    </div>
                ) : downloads.length > 0 ? (
                    <div className="downloads-list">
                        <AnimatePresence>
                            {downloads.map(download => (
                                <motion.div
                                    key={download.id}
                                    className={`download-item ${download.status}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    layout
                                >
                                    <div className="download-image">
                                        {download.imageUrl ? (
                                            <img src={download.imageUrl} alt={download.name} />
                                        ) : (
                                            <div className="image-placeholder">
                                                <Download size={24} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="download-info">
                                        <div className="download-header">
                                            <h3>{download.name}</h3>
                                            <span className={`status-badge ${download.status}`}>
                                                {getStatusIcon(download.status)}
                                                {getStatusLabel(download.status)}
                                            </span>
                                        </div>

                                        {download.status === 'downloading' && (
                                            <div className="progress-container">
                                                <div className="progress-bar">
                                                    <div
                                                        className="progress-fill"
                                                        style={{ width: `${download.progress}%` }}
                                                    />
                                                </div>
                                                <span className="progress-text">
                                                    {download.progress.toFixed(1)}%
                                                </span>
                                            </div>
                                        )}

                                        <div className="download-stats">
                                            {download.status === 'downloading' && (
                                                <>
                                                    <span className="stat-item">
                                                        <ArrowDownCircle size={14} />
                                                        {formatSpeed(download.downloadSpeed)}
                                                    </span>
                                                    <span className="stat-item">
                                                        <ArrowUpCircle size={14} />
                                                        {formatSpeed(download.uploadSpeed)}
                                                    </span>
                                                    <span className="stat-item">
                                                        <Clock size={14} />
                                                        {formatEta(download.eta)}
                                                    </span>
                                                </>
                                            )}
                                            <span className="stat-item">
                                                <Users size={14} />
                                                {download.peers} peers / {download.seeds} seeds
                                            </span>
                                            <span className="stat-item">
                                                <HardDrive size={14} />
                                                {formatBytes(download.downloaded)} / {formatBytes(download.totalSize)}
                                            </span>
                                        </div>

                                        {download.error && (
                                            <div className="download-error">
                                                <AlertCircle size={14} />
                                                {download.error}
                                            </div>
                                        )}
                                    </div>

                                    <div className="download-actions">
                                        {download.status === 'downloading' && (
                                            <button
                                                className="btn-action"
                                                onClick={() => pauseDownload(download.id)}
                                                title="Pausar"
                                            >
                                                <Pause size={18} />
                                            </button>
                                        )}
                                        {download.status === 'paused' && (
                                            <button
                                                className="btn-action"
                                                onClick={() => resumeDownload(download.id)}
                                                title="Reanudar"
                                            >
                                                <Play size={18} />
                                            </button>
                                        )}
                                        {download.status === 'completed' && download.savePath && (
                                            <button
                                                className="btn-action"
                                                onClick={() => handleOpenFolder(download.savePath!)}
                                                title="Abrir carpeta"
                                            >
                                                <FolderOpen size={18} />
                                            </button>
                                        )}
                                        {download.status === 'error' && (
                                            <button
                                                className="btn-action"
                                                onClick={() => resumeDownload(download.id)}
                                                title="Reintentar"
                                            >
                                                <RefreshCw size={18} />
                                            </button>
                                        )}
                                        <button
                                            className="btn-action danger"
                                            onClick={() => cancelDownload(download.id)}
                                            title="Cancelar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Download size={64} />
                        </div>
                        <h3>No hay descargas</h3>
                        <p>Añade un enlace magnet o busca repacks para comenzar</p>
                        <div className="empty-actions">
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAddModal(true)}
                            >
                                <Link2 size={18} />
                                Añadir Magnet
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowSearchModal(true)}
                            >
                                <Search size={18} />
                                Buscar Repacks
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Magnet Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        className="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            className="add-modal"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Añadir Descarga</h2>
                                <button className="modal-close" onClick={() => setShowAddModal(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="modal-content">
                                <div className="form-group">
                                    <label>Nombre del juego</label>
                                    <input
                                        type="text"
                                        value={gameName}
                                        onChange={e => setGameName(e.target.value)}
                                        placeholder="Ej: Baldur's Gate 3"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>Enlace Magnet *</label>
                                    <textarea
                                        value={magnetUri}
                                        onChange={e => setMagnetUri(e.target.value)}
                                        placeholder="magnet:?xt=urn:btih:..."
                                        rows={4}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                                    Cancelar
                                </button>
                                <button className="btn btn-primary" onClick={handleAddMagnet}>
                                    <Download size={16} />
                                    Añadir a Descargas
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Repacks Modal */}
            <AnimatePresence>
                {showSearchModal && (
                    <motion.div
                        className="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSearchModal(false)}
                    >
                        <motion.div
                            className="search-modal"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Buscar Repacks</h2>
                                <button className="modal-close" onClick={() => setShowSearchModal(false)}>
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="modal-content">
                                <div className="search-bar">
                                    <Search size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        placeholder="Buscar juego..."
                                        autoFocus
                                    />
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSearch}
                                        disabled={isSearching || !searchQuery.trim()}
                                    >
                                        {isSearching ? <Loader2 size={16} className="spinning" /> : 'Buscar'}
                                    </button>
                                </div>

                                <div className="search-results">
                                    {searchResults.length > 0 ? (
                                        searchResults.map(repack => (
                                            <div key={repack.id} className="repack-item">
                                                <div className="repack-info">
                                                    <h4>{repack.name}</h4>
                                                    <div className="repack-meta">
                                                        <span>{repack.size}</span>
                                                        {repack.source && (
                                                            <span className="source-badge">{repack.source}</span>
                                                        )}
                                                        {repack.uploadDate && (
                                                            <span>{repack.uploadDate}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleSelectRepack(repack)}
                                                >
                                                    <Download size={16} />
                                                    Descargar
                                                </button>
                                            </div>
                                        ))
                                    ) : searchQuery && !isSearching ? (
                                        <div className="no-results">
                                            <p>No se encontraron repacks para "{searchQuery}"</p>
                                        </div>
                                    ) : (
                                        <div className="search-hint">
                                            <p>Ingresa el nombre de un juego para buscar repacks disponibles</p>
                                        </div>
                                    )}
                                </div>

                                <div className="search-disclaimer">
                                    <AlertCircle size={14} />
                                    <span>Los repacks son distribuidos por terceros. Descarga bajo tu propia responsabilidad.</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
