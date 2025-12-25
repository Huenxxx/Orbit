import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Lock,
    User,
    Eye,
    EyeOff,
    Loader2,
    AlertCircle,
    ArrowRight,
    CheckCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { EmailVerificationModal } from '../EmailVerificationModal/EmailVerificationModal';
import './AuthModal.css';

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

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [mode, setMode] = useState<AuthMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [pendingRegistration, setPendingRegistration] = useState<{
        email: string;
        password: string;
        username: string;
    } | null>(null);

    const { login, register, loginWithGoogle, resetPassword, isLoading, error, clearError } = useAuthStore();

    // Initialize ipcRenderer for Electron
    const ipcRenderer = typeof window !== 'undefined' && window.require
        ? window.require('electron').ipcRenderer
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setSuccessMessage('');

        try {
            if (mode === 'login') {
                await login(email, password);
                onClose();
            } else if (mode === 'register') {
                // Store registration details
                const registrationData = { email, password, username };
                setPendingRegistration(registrationData);

                // Check if we're in Electron and can send emails
                if (ipcRenderer) {
                    try {
                        const result = await ipcRenderer.invoke('send-verification-email', {
                            email,
                            username
                        }) as { success: boolean; error?: string };

                        if (result.success) {
                            // Email sent, show verification modal
                            setShowVerificationModal(true);
                        } else {
                            // Email failed, proceed with registration anyway
                            console.warn('Could not send verification email:', result.error);
                            await performRegistration(registrationData);
                        }
                    } catch (err) {
                        console.error('Error sending verification email:', err);
                        // Email service failed, proceed with registration
                        await performRegistration(registrationData);
                    }
                } else {
                    // Browser mode - show verification modal anyway (demo mode)
                    // In production, you would want to skip verification in browser
                    setShowVerificationModal(true);
                }
            } else if (mode === 'forgot') {
                await resetPassword(email);
                setSuccessMessage('Se ha enviado un email para restablecer tu contraseña');
            }
        } catch (err) {
            // Error is handled by the store
        }
    };

    const performRegistration = async (data: { email: string; password: string; username: string }) => {
        try {
            await register(data.email, data.password, data.username);
            // Send welcome email after successful registration
            if (ipcRenderer) {
                await ipcRenderer.invoke('send-welcome-email', {
                    email: data.email,
                    username: data.username
                });
            }
            setShowVerificationModal(false);
            setPendingRegistration(null);
            onClose();
        } catch (err) {
            // Error is handled by the store
            setShowVerificationModal(false);
            setPendingRegistration(null);
        }
    };

    const handleVerificationSuccess = async () => {
        if (pendingRegistration) {
            await performRegistration(pendingRegistration);
        }
    };

    const handleVerificationClose = () => {
        setShowVerificationModal(false);
        setPendingRegistration(null);
    };

    const handleGoogleLogin = async () => {
        clearError();
        try {
            await loginWithGoogle();
            onClose();
        } catch (err) {
            // Error is handled by the store
        }
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        clearError();
        setSuccessMessage('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                className="auth-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className="auth-modal"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="orbit-ring"></div>
                            <div className="orbit-core"></div>
                        </div>
                        <h2>
                            {mode === 'login' && 'Bienvenido de vuelta'}
                            {mode === 'register' && 'Crear cuenta'}
                            {mode === 'forgot' && 'Recuperar contraseña'}
                        </h2>
                        <p>
                            {mode === 'login' && 'Inicia sesión para sincronizar tu biblioteca'}
                            {mode === 'register' && 'Únete a ORBIT y sincroniza tus juegos'}
                            {mode === 'forgot' && 'Te enviaremos un email para restablecer tu contraseña'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="auth-form">
                        {/* Error Message */}
                        {error && (
                            <motion.div
                                className="auth-error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <AlertCircle size={16} />
                                {error}
                            </motion.div>
                        )}

                        {/* Success Message */}
                        {successMessage && (
                            <motion.div
                                className="auth-success"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <CheckCircle size={16} />
                                {successMessage}
                            </motion.div>
                        )}

                        {/* Username (only for register) */}
                        {mode === 'register' && (
                            <div className="input-group">
                                <User size={18} className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Nombre de usuario"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    minLength={3}
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className="input-group">
                            <Mail size={18} className="input-icon" />
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        {/* Password (not for forgot) */}
                        {mode !== 'forgot' && (
                            <div className="input-group">
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        )}

                        {/* Forgot Password Link */}
                        {mode === 'login' && (
                            <button
                                type="button"
                                className="forgot-link"
                                onClick={() => switchMode('forgot')}
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary auth-submit"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="spinner" />
                            ) : (
                                <>
                                    {mode === 'login' && 'Iniciar sesión'}
                                    {mode === 'register' && 'Crear cuenta'}
                                    {mode === 'forgot' && 'Enviar email'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>

                        {/* Google Login (not for forgot) */}
                        {mode !== 'forgot' && (
                            <>
                                <div className="auth-divider">
                                    <span>o continúa con</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-google"
                                    onClick={handleGoogleLogin}
                                    disabled={isLoading}
                                >
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    Google
                                </button>
                            </>
                        )}
                    </form>

                    {/* Footer */}
                    <div className="auth-footer">
                        {mode === 'login' && (
                            <p>
                                ¿No tienes cuenta?{' '}
                                <button onClick={() => switchMode('register')}>Regístrate</button>
                            </p>
                        )}
                        {mode === 'register' && (
                            <p>
                                ¿Ya tienes cuenta?{' '}
                                <button onClick={() => switchMode('login')}>Inicia sesión</button>
                            </p>
                        )}
                        {mode === 'forgot' && (
                            <p>
                                <button onClick={() => switchMode('login')}>Volver al inicio de sesión</button>
                            </p>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Email Verification Modal */}
            {pendingRegistration && (
                <EmailVerificationModal
                    isOpen={showVerificationModal}
                    onClose={handleVerificationClose}
                    onVerified={handleVerificationSuccess}
                    email={pendingRegistration.email}
                    username={pendingRegistration.username}
                />
            )}
        </AnimatePresence>
    );
}
