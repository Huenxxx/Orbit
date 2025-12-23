import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Upload,
    Gamepad2,
    Image as ImageIcon,
    Folder,
    Tag,
    Save
} from 'lucide-react';
import { useGamesStore } from '../../stores';
import type { Game, GamePlatform, GameStatus } from '../../types';
import './AddGameModal.css';

interface AddGameModalProps {
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

const defaultGenres = [
    'Acción', 'Aventura', 'RPG', 'Estrategia', 'Simulación',
    'Deportes', 'Puzzle', 'Horror', 'Shooter', 'Indie',
    'Multijugador', 'Mundo Abierto'
];

export function AddGameModal({ onClose }: AddGameModalProps) {
    const { addGame } = useGamesStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        coverImage: '',
        executablePath: '',
        platform: 'custom' as GamePlatform,
        developer: '',
        genres: [] as string[],
        tags: [] as string[],
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) return;

        setIsSubmitting(true);

        try {
            const newGame: Omit<Game, 'id' | 'dateAdded'> = {
                title: formData.title.trim(),
                description: formData.description.trim(),
                coverImage: formData.coverImage || '',
                executablePath: formData.executablePath || undefined,
                platform: formData.platform,
                developer: formData.developer.trim() || 'Desconocido',
                genres: formData.genres,
                playtime: 0,
                status: 'not_started' as GameStatus,
                tags: formData.tags,
                isFavorite: false,
                isInstalled: !!formData.executablePath
            };

            await addGame(newGame);
            onClose();
        } catch (error) {
            console.error('Failed to add game:', error);
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
                className="modal"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-title">
                        <Gamepad2 size={24} />
                        <h2>Agregar juego</h2>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="modal-body">
                    {/* Basic Info */}
                    <div className="form-section">
                        <h3>Información básica</h3>

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
                    </div>

                    {/* Media */}
                    <div className="form-section">
                        <h3>Multimedia</h3>

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
                    </div>

                    {/* Executable */}
                    <div className="form-section">
                        <h3>Ejecutable</h3>

                        <div className="form-group">
                            <label htmlFor="executablePath">Ruta del ejecutable</label>
                            <div className="input-with-icon">
                                <Folder size={18} />
                                <input
                                    id="executablePath"
                                    type="text"
                                    className="input"
                                    placeholder="C:\Games\MiJuego\game.exe"
                                    value={formData.executablePath}
                                    onChange={e => handleChange('executablePath', e.target.value)}
                                />
                            </div>
                            <span className="form-hint">
                                Opcional. Permite lanzar el juego directamente desde ORBIT.
                            </span>
                        </div>
                    </div>

                    {/* Genres */}
                    <div className="form-section">
                        <h3>Géneros</h3>
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
                    <div className="form-section">
                        <h3>Etiquetas personalizadas</h3>
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
                        <Save size={16} />
                        {isSubmitting ? 'Guardando...' : 'Guardar juego'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
