import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Play,
    FolderOpen,
    Settings,
    Trash2,
    Edit,
    ExternalLink,
    Copy,
    Heart,
    Star
} from 'lucide-react';
import './GameContextMenu.css';

export interface ContextMenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    divider?: boolean;
}

interface GameContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export function GameContextMenu({ x, y, items, onClose }: GameContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position to stay within viewport
    useEffect(() => {
        if (menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            if (x + rect.width > viewportWidth) {
                adjustedX = viewportWidth - rect.width - 10;
            }

            if (y + rect.height > viewportHeight) {
                adjustedY = viewportHeight - rect.height - 10;
            }

            menuRef.current.style.left = `${adjustedX}px`;
            menuRef.current.style.top = `${adjustedY}px`;
        }
    }, [x, y]);

    return (
        <motion.div
            ref={menuRef}
            className="game-context-menu"
            style={{ left: x, top: y }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
        >
            {items.map((item, index) => (
                <div key={item.id}>
                    {item.divider && index > 0 && <div className="context-divider" />}
                    <button
                        className={`context-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
                        onClick={() => {
                            if (!item.disabled) {
                                item.onClick();
                                onClose();
                            }
                        }}
                        disabled={item.disabled}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                </div>
            ))}
        </motion.div>
    );
}

// Hook para manejar el menú contextual
export function useContextMenu() {
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        items: ContextMenuItem[];
    } | null>(null);

    const showContextMenu = (e: React.MouseEvent, items: ContextMenuItem[]) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, items });
    };

    const hideContextMenu = () => {
        setContextMenu(null);
    };

    return { contextMenu, showContextMenu, hideContextMenu };
}

// Re-export icons for convenience
export { Play, FolderOpen, Settings, Trash2, Edit, ExternalLink, Copy, Heart, Star };
