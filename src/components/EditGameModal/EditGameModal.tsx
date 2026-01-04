import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Gamepad2,
    Image as ImageIcon,
    Folder,
    Tag,
    Save,
    Loader2,
    MoreHorizontal
} from 'lucide-react';
import { useGamesStore, useUIStore } from '../../stores';
import { useNotificationStore } from '../../stores/notificationStore';
import { ipc } from '../../services/ipc';
import type { Game, GamePlatform, GameStatus } from '../../types';
import './EditGameModal.css';

// Check if we're in a desktop app (has IPC available)
const isDesktopApp = typeof window !== 'undefined' && (
    (window as any).csharp?.invoke ||
    (window as any).chrome?.webview
);

interface EditGameModalProps {
    game: Game;
    onClose: () => void;
}

const platforms: { value: GamePlatform; label: string }[] = [
    { value: 'steam', label: 'Steam' },
    { value: 'epic', label: 'Epic Games' },
    { value: 'gog', label: 'GOG' },
    { value: 'origin', label: 'Origin' },
    { value: 'uplay', label: 'Ubisoft' },
    { value: 'minecraft', label: 'Minecraft' },
    { value: 'custom', label: 'Personalizado' },
];

const statusOptions: { value: GameStatus; label: string }[] = [
    { value: 'not_started', label: 'Sin empezar' },
    { value: 'playing', label: 'Jugando' },
    { value: 'completed', label: 'Completado' },
    { value: 'on_hold', label: 'En pausa' },
    { value: 'dropped', label: 'Abandonado' },
];

const defaultGenres = [
    'Acción', 'Aventura', 'RPG', 'Estrategia', 'Simulación',
    'Deportes', 'Puzzle', 'Horror', 'Shooter', 'Indie',
    'Multijugador', 'Mundo Abierto'
];

export function EditGameModal({ game, onClose }: EditGameModalProps) {
    const { updateGame } = useGamesStore();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'info' | 'media' | 'advanced'>('info');

    const [formData, setFormData] = useState({
        title: game.title,
        description: game.description || '',
        coverImage: game.coverImage || '',
        executablePath: game.executablePath || '',
        installPath: game.installPath || '',
        platform: game.platform,
        developer: game.developer,
        genres: game.genres || [],
        tags: game.tags || [],
        status: game.status,
        rating: game.rating || 0,
        customTag: ''
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const toggleGenre = (genre: string) => {
        setFormData(prev => ({
            ...prev,
            genres: prev.genres.includes(genre)
                ? prev.genres.filter(g => g !== genre)
                : [...prev.genres, genre]
        }));
    };

    const addCustomTag = () => {
        if (formData.customTag.trim() && !formData.tags.includes(formData.customTag.trim())) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, prev.customTag.trim()],
                customTag: ''
            }));
        }
    };

    const removeTag = (tag: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(t => t !== tag)
        }));
    };

    const [isScanning, setIsScanning] = useState(false);
    const [availableExes, setAvailableExes] = useState<string[]>([]);

    // Browse for executable file
    const browseExecutable = async () => {
        try {
            const result = await ipc.invoke<{ success: boolean; path?: string }>('select-executable');

            if (result?.success && result.path) {
                handleChange('executablePath', result.path);

                // Auto-fill install path from executable directory if empty
                // We use the directory of the exe as effective install path if none other offered
                if (!formData.installPath) {
                    const installDir = result.path.substring(0, result.path.lastIndexOf('\\'));
                    handleChange('installPath', installDir);
                }
            }
        } catch (error) {
            console.error('Error selecting executable:', error);
        }
    };

    // Browse for directory
    const browseDirectory = async () => {
        try {
            const result = await ipc.invoke<{ success: boolean; path?: string }>('select-directory');

            if (result?.success && result.path) {
                const selectedPath = result.path;
                handleChange('installPath', selectedPath);

                setIsScanning(true);
                setAvailableExes([]);
                handleChange('executablePath', ''); // Reset

                // Auto-scan for executables
                try {
                    const scanResult = await ipc.invoke<{ success: boolean; executables?: string[] }>('scan-directory-for-exe', selectedPath);

                    if (scanResult?.success && scanResult.executables && scanResult.executables.length > 0) {
                        setAvailableExes(scanResult.executables);

                        // Heuristic logic to pick best one
                        const exes = scanResult.executables;
                        const forbidden = ['unins', 'uninstall', 'crash', 'reporter', 'config', 'setup', 'dxwebsetup', 'vcredist', 'unitycrashhandler'];

                        const likelyGameExes = exes.filter(exe => {
                            const name = exe.split('\\').pop()?.toLowerCase() || '';
                            return !forbidden.some(f => name.includes(f));
                        });

                        // 1. Try exact/fuzzy title match on filtered list
                        const titleLower = game.title.toLowerCase().replace(/[^a-z0-9]/g, '');
                        let bestExe = likelyGameExes.find(exe => {
                            const name = exe.split('\\').pop()?.toLowerCase().replace('.exe', '').replace(/[^a-z0-9]/g, '') || '';
                            return name === titleLower || name.includes(titleLower);
                        });

                        // 2. If no title match, try looking for 'shipping', 'launcher', or simply the shortest/simplest name in base folder
                        if (!bestExe && likelyGameExes.length > 0) {
                            bestExe = likelyGameExes[0];
                        }

                        // 3. Fallback to raw list
                        if (!bestExe && exes.length > 0) {
                            bestExe = exes[0];
                        }

                        if (bestExe) {
                            handleChange('executablePath', bestExe);
                        }
                    } else {
                        setAvailableExes([]);
                    }
                } catch (err) {
                    console.error('Auto-scan failed', err);
                } finally {
                    setIsScanning(false);
                }
            }
        } catch (error) {
            console.error('Error selecting directory:', error);
            setIsScanning(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) return;

        setIsSubmitting(true);

        try {
            console.log('Saving game with data:', {
                id: game.id,
                installPath: formData.installPath,
                executablePath: formData.executablePath
            });

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result: any = await updateGame(game.id, {
                title: formData.title,
                description: formData.description,
                executablePath: formData.executablePath || undefined,
                installPath: formData.installPath || undefined,
                coverImage: formData.coverImage,
                backgroundImage: (formData as any).backgroundImage,
                platform: (formData as any).platform,
                genres: formData.genres,
                developer: formData.developer,
                publisher: (formData as any).publisher,
                releaseDate: (formData as any).releaseDate,
                tags: formData.tags,
                status: (formData as any).status,
                rating: (formData as any).rating || undefined,
                isInstalled: !!formData.executablePath
            });

            if (result && result.success === false) {
                useNotificationStore.getState().showError('Error al guardar', result.error || 'No se pudieron guardar los cambios');
                console.error('Update game failed:', result.error);
            } else {
                useNotificationStore.getState().showSuccess('Juego actualizado', 'Los cambios se han guardado correctamente');
                onClose();
            }
        } catch (error) {
            console.error('Failed to update game:', error);
            useNotificationStore.getState().showError('Error', 'Ha ocurrido un error inesperado al guardar');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="edit-game-modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <Gamepad2 size={24} />
                        <h2>Editar juego</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        className={activeTab === 'info' ? 'active' : ''}
                        onClick={() => setActiveTab('info')}
                    >
                        Información
                    </button>
                    <button
                        className={activeTab === 'media' ? 'active' : ''}
                        onClick={() => setActiveTab('media')}
                    >
                        Multimedia
                    </button>
                    <button
                        className={activeTab === 'advanced' ? 'active' : ''}
                        onClick={() => setActiveTab('advanced')}
                    >
                        Avanzado
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="modal-body">
                    {activeTab === 'info' && (
                        <div className="form-section">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="title">Título del juego *</label>
                                    <input
                                        id="title"
                                        type="text"
                                        className="input"
                                        placeholder="Ej: The Witcher 3"
                                        value={formData.title}
                                        onChange={e => handleChange('title', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="developer">Desarrollador</label>
                                    <input
                                        id="developer"
                                        type="text"
                                        className="input"
                                        placeholder="Ej: CD Projekt Red"
                                        value={formData.developer}
                                        onChange={e => handleChange('developer', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Descripción</label>
                                <textarea
                                    id="description"
                                    className="input textarea"
                                    placeholder="Una breve descripción del juego..."
                                    rows={3}
                                    value={formData.description}
                                    onChange={e => handleChange('description', e.target.value)}
                                />
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="platform">Plataforma</label>
                                    <select
                                        id="platform"
                                        className="input select"
                                        value={formData.platform}
                                        onChange={e => handleChange('platform', e.target.value)}
                                    >
                                        {platforms.map(p => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="status">Estado</label>
                                    <select
                                        id="status"
                                        className="input select"
                                        value={formData.status}
                                        onChange={e => handleChange('status', e.target.value)}
                                    >
                                        {statusOptions.map(s => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Genres */}
                            <div className="form-group">
                                <label>Géneros</label>
                                <div className="genre-chips">
                                    {defaultGenres.map(genre => (
                                        <button
                                            key={genre}
                                            type="button"
                                            className={`genre-chip ${formData.genres.includes(genre) ? 'active' : ''}`}
                                            onClick={() => toggleGenre(genre)}
                                        >
                                            {genre}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="form-group">
                                <label>Etiquetas personalizadas</label>
                                <div className="tags-input">
                                    <div className="input-with-button">
                                        <Tag size={18} />
                                        <input
                                            type="text"
                                            className="input"
                                            placeholder="Agregar etiqueta..."
                                            value={formData.customTag}
                                            onChange={e => handleChange('customTag', e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                                        />
                                        <button type="button" className="btn btn-ghost" onClick={addCustomTag}>
                                            Agregar
                                        </button>
                                    </div>
                                    {formData.tags.length > 0 && (
                                        <div className="tags-list">
                                            {formData.tags.map(tag => (
                                                <span key={tag} className="tag">
                                                    {tag}
                                                    <button type="button" onClick={() => removeTag(tag)}>
                                                        <X size={12} />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="form-section">
                            <div className="form-group">
                                <label htmlFor="coverImage">URL de la portada</label>
                                <div className="input-with-icon">
                                    <ImageIcon size={18} />
                                    <input
                                        id="coverImage"
                                        type="url"
                                        className="input"
                                        placeholder="https://ejemplo.com/cover.jpg"
                                        value={formData.coverImage}
                                        onChange={e => handleChange('coverImage', e.target.value)}
                                    />
                                </div>
                                {formData.coverImage && (
                                    <div className="cover-preview">
                                        <img src={formData.coverImage} alt="Preview" />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="rating">Valoración personal</label>
                                <div className="rating-input">
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={`star-btn ${formData.rating >= star ? 'active' : ''}`}
                                            onClick={() => handleChange('rating', star)}
                                        >
                                            ★
                                        </button>
                                    ))}
                                    {formData.rating > 0 && (
                                        <button
                                            type="button"
                                            className="clear-rating"
                                            onClick={() => handleChange('rating', 0)}
                                        >
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'advanced' && (
                        <div className="form-section">
                            <div className="form-group">
                                <label htmlFor="installPath">Carpeta de instalación</label>
                                <div className="input-with-browse">
                                    <div className="input-with-icon">
                                        <Folder size={18} />
                                        <input
                                            id="installPath"
                                            type="text"
                                            className="input"
                                            placeholder="C:\Games\MiJuego"
                                            value={formData.installPath}
                                            onChange={e => handleChange('installPath', e.target.value)}
                                        />
                                    </div>
                                    {isDesktopApp && (
                                        <button
                                            type="button"
                                            className="btn btn-browse"
                                            onClick={async () => {
                                                await browseDirectory();
                                                // Trigger scan logic is handled in browseDirectory now
                                            }}
                                            title="Explorar..."
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                    )}
                                </div>
                                <span className="form-hint">
                                    Selecciona la carpeta raíz del juego. Orbit detectará el ejecutable automáticamente.
                                </span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="executablePath">Ejecutable detectado</label>
                                <div className="input-with-icon">
                                    <Gamepad2 size={18} className="text-primary" />
                                    <select
                                        id="executablePath"
                                        className="input select"
                                        value={formData.executablePath}
                                        onChange={e => handleChange('executablePath', e.target.value)}
                                        disabled={isScanning || (availableExes.length === 0 && !formData.executablePath)}
                                    >
                                        <option value="">
                                            {isScanning
                                                ? 'Escaneando carpeta...'
                                                : (availableExes.length === 0 && !formData.executablePath
                                                    ? 'No se encontraron ejecutables'
                                                    : 'Selecciona un ejecutable...')
                                            }
                                        </option>

                                        {/* Show currently selected value if not in list (Manual selection) */}
                                        {formData.executablePath && !availableExes.includes(formData.executablePath) && (
                                            <option value={formData.executablePath}>
                                                {formData.executablePath.split('\\').pop()} (Manual)
                                            </option>
                                        )}

                                        {availableExes.map(exe => (
                                            <option key={exe} value={exe}>
                                                {exe.replace(formData.installPath, '').replace(/^\\/, '')} ({exe.split('\\').pop()})
                                            </option>
                                        ))}
                                    </select>
                                    {isScanning && <Loader2 size={18} className="spinner text-primary" />}

                                    {/* Manual override button */}
                                    {isDesktopApp && (
                                        <button
                                            type="button"
                                            className="btn btn-browse"
                                            onClick={browseExecutable}
                                            title="Seleccionar archivo .exe manualmente"
                                            style={{ marginLeft: '8px' }}
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                    )}
                                </div>
                                {formData.executablePath && (
                                    <span className="form-hint text-success">
                                        ¡Ejecutable vinculado correctamente!
                                    </span>
                                )}
                                {!isScanning && availableExes.length === 0 && formData.installPath && (
                                    <span className="form-hint text-warning">
                                        No se encontraron archivos .exe automáticamente. Usa el botón (...) para seleccionarlo manualment.
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={!formData.title.trim() || isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={16} className="spinner" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Guardar cambios
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
