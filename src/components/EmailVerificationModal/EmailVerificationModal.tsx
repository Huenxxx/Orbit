import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Loader2,
    AlertCircle,
    CheckCircle,
    RefreshCcw,
    X,
    Sparkles
} from 'lucide-react';
import './EmailVerificationModal.css';

// Declare global ipcRenderer for Electron
declare global {
    interface Window {
        require?: (module: string) => {
            ipcRenderer: {
                invoke: (channel: string, data?: unknown) => Promise<unknown>;
            };
        };
    }
}

interface EmailVerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
    email: string;
    username: string;
}

export function EmailVerificationModal({
    isOpen,
    onClose,
    onVerified,
    email,
    username
}: EmailVerificationModalProps) {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Initialize ipcRenderer for Electron
    const ipcRenderer = typeof window !== 'undefined' && window.require
        ? window.require('electron').ipcRenderer
        : null;

    useEffect(() => {
        if (isOpen && inputRefs.current[0]) {
            inputRefs.current[0].focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleInputChange = (index: number, value: string) => {
        if (!/^[a-zA-Z0-9]*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value.toUpperCase();
        setCode(newCode);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim().toUpperCase();
        if (pastedData.length === 6 && /^[A-Z0-9]+$/.test(pastedData)) {
            setCode(pastedData.split(''));
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setError('Por favor, introduce el código completo');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (ipcRenderer) {
                const result = await ipcRenderer.invoke('verify-email-code', {
                    email,
                    code: fullCode
                }) as { success: boolean; error?: string };

                if (result.success) {
                    setSuccess(true);
                    setTimeout(() => {
                        onVerified();
                    }, 1500);
                } else {
                    setError(result.error || 'Código incorrecto');
                    setCode(['', '', '', '', '', '']);
                    inputRefs.current[0]?.focus();
                }
            } else {
                // Fallback for browser (demo mode)
                setSuccess(true);
                setTimeout(() => {
                    onVerified();
                }, 1500);
            }
        } catch (err) {
            setError('Error al verificar el código');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;

        setIsResending(true);
        setError('');

        try {
            if (ipcRenderer) {
                const result = await ipcRenderer.invoke('resend-verification-email', {
                    email,
                    username
                }) as { success: boolean; error?: string };

                if (result.success) {
                    setCountdown(60);
                    setCode(['', '', '', '', '', '']);
                    inputRefs.current[0]?.focus();
                } else {
                    setError(result.error || 'Error al reenviar el código');
                }
            } else {
                // Fallback for browser
                setCountdown(60);
                setCode(['', '', '', '', '', '']);
            }
        } catch (err) {
            setError('Error al reenviar el código');
        } finally {
            setIsResending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="verification-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <motion.div
                    className="verification-modal"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                >
                    {/* Close Button */}
                    <button className="verification-close" onClick={onClose}>
                        <X size={20} />
                    </button>

                    {success ? (
                        /* Success State */
                        <motion.div
                            className="verification-success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                        >
                            <div className="success-icon">
                                <CheckCircle size={64} />
                                <Sparkles className="sparkle sparkle-1" size={20} />
                                <Sparkles className="sparkle sparkle-2" size={16} />
                                <Sparkles className="sparkle sparkle-3" size={18} />
                            </div>
                            <h2>¡Verificación Exitosa!</h2>
                            <p>Tu correo electrónico ha sido verificado correctamente.</p>
                        </motion.div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="verification-header">
                                <div className="verification-icon">
                                    <Mail size={32} />
                                </div>
                                <h2>Verifica tu correo electrónico</h2>
                                <p>
                                    Hemos enviado un código de verificación a:
                                    <strong>{email}</strong>
                                </p>
                            </div>

                            {/* Code Input */}
                            <div className="verification-code-container">
                                <div className="code-inputs">
                                    {code.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={(el) => { inputRefs.current[index] = el }}
                                            type="text"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleInputChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            onPaste={index === 0 ? handlePaste : undefined}
                                            className={`code-input ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
                                            disabled={isLoading}
                                        />
                                    ))}
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <motion.div
                                        className="verification-error"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <AlertCircle size={16} />
                                        {error}
                                    </motion.div>
                                )}
                            </div>

                            {/* Verify Button */}
                            <button
                                className="btn btn-primary verification-submit"
                                onClick={handleVerify}
                                disabled={isLoading || code.join('').length !== 6}
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="spinner" />
                                ) : (
                                    'Verificar código'
                                )}
                            </button>

                            {/* Resend Option */}
                            <div className="verification-resend">
                                <p>¿No recibiste el código?</p>
                                <button
                                    onClick={handleResend}
                                    disabled={isResending || countdown > 0}
                                    className="resend-btn"
                                >
                                    {isResending ? (
                                        <Loader2 size={16} className="spinner" />
                                    ) : (
                                        <>
                                            <RefreshCcw size={16} />
                                            {countdown > 0 ? `Reenviar en ${countdown}s` : 'Reenviar código'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
