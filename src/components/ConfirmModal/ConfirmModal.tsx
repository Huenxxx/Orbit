import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDanger = false,
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isOpen && e.key === 'Escape') {
                onCancel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-portal-root">
                    <motion.div
                        className="confirm-modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                    >
                        <motion.div
                            className="confirm-modal"
                            ref={modalRef}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="confirm-modal-header">
                                <div className={`icon-wrapper ${isDanger ? 'danger' : 'warning'}`}>
                                    <AlertTriangle size={24} />
                                </div>
                                <button className="close-btn" onClick={onCancel}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="confirm-modal-content">
                                <h3>{title}</h3>
                                <p>{message}</p>
                            </div>

                            <div className="confirm-modal-actions">
                                <button className="btn btn-secondary" onClick={onCancel}>
                                    {cancelText}
                                </button>
                                <button
                                    className={`btn ${isDanger ? 'btn-danger' : 'btn-primary'}`}
                                    onClick={() => {
                                        onConfirm();
                                        onCancel();
                                    }}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
