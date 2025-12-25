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
    CheckCircle,
    Gamepad2,
    Sparkles
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { EmailVerificationModal } from '../EmailVerificationModal/EmailVerificationModal';
import './AuthScreen.css';

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

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthScreen() {
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

    // Validation states
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Processing state to prevent multiple submissions
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingMessage, setProcessingMessage] = useState('');

    const { loginWithUsername, register, loginWithGoogle, resetPassword, isLoading, error, clearError, isAvailable, checkUsernameAvailable } = useAuthStore();

    // Initialize ipcRenderer for Electron
    const ipcRenderer = typeof window !== 'undefined' && window.require
        ? window.require('electron').ipcRenderer
        : null;

    // Validation function for registration
    const validateRegistration = async (): Promise<{ isValid: boolean; errors: string[] }> => {
        const { validateEmail, validatePassword, validateUsername } = await import('../../utils/validation');
        const errors: string[] = [];

        // Validate email
        const emailResult = validateEmail(email);
        if (!emailResult.isValid && emailResult.error) {
            errors.push(emailResult.error);
        }

        // Validate password
        const passwordResult = validatePassword(password);
        if (!passwordResult.isValid) {
            errors.push(...passwordResult.errors);
        }

        // Validate username format
        const usernameResult = validateUsername(username);
        if (!usernameResult.isValid && usernameResult.error) {
            errors.push(usernameResult.error);
        }

        // Check if username is available
        if (usernameResult.isValid) {
            const available = await checkUsernameAvailable(username);
            if (!available) {
                errors.push('Este nombre de usuario ya está en uso');
            }
        }

        return { isValid: errors.length === 0, errors };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent multiple submissions
        if (isProcessing || isLoading) return;

        clearError();
        setSuccessMessage('');
        setValidationErrors([]);

        try {
            if (mode === 'login') {
                // Login with username instead of email
                await loginWithUsername(username, password);
            } else if (mode === 'register') {
                setIsProcessing(true);
                setProcessingMessage('Validando datos...');

                // Validate all fields before proceeding
                const validation = await validateRegistration();
                if (!validation.isValid) {
                    setValidationErrors(validation.errors);
                    setIsProcessing(false);
                    setProcessingMessage('');
                    return;
                }

                setProcessingMessage('Enviando código de verificación...');

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
                    setShowVerificationModal(true);
                }

                setIsProcessing(false);
                setProcessingMessage('');
            } else if (mode === 'forgot') {
                await resetPassword(email);
                setSuccessMessage('Se ha enviado un email para restablecer tu contraseña');
            }
        } catch (err) {
            // Error is handled by the store
            setIsProcessing(false);
            setProcessingMessage('');
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
        } catch (err) {
            // Error is handled by the store
        }
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        clearError();
        setSuccessMessage('');
    };

    // If Firebase is not available, show configuration message
    if (!isAvailable) {
        return (
            <div className="auth-screen">
                <div className="auth-screen-bg">
                    <div className="bg-gradient-1"></div>
                    <div className="bg-gradient-2"></div>
                    <div className="bg-gradient-3"></div>
                </div>

                <motion.div
                    className="auth-card"
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="auth-header">
                        <div className="auth-logo">
                            <div className="orbit-ring"></div>
                            <div className="orbit-core"></div>
                        </div>
                        <h1>ORBIT</h1>
                        <p className="auth-subtitle">Game Library Manager</p>
                    </div>

                    <div className="firebase-not-configured">
                        <AlertCircle size={48} />
                        <h2>Firebase no configurado</h2>
                        <p>
                            Para usar ORBIT, es necesario configurar Firebase.
                            Por favor, contacta al administrador para obtener las credenciales.
                        </p>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="auth-screen">
            {/* Animated Background */}
            <div className="auth-screen-bg">
                <div className="bg-gradient-1"></div>
                <div className="bg-gradient-2"></div>
                <div className="bg-gradient-3"></div>
                <div className="floating-icons">
                    <Gamepad2 className="floating-icon icon-1" size={40} />
                    <Sparkles className="floating-icon icon-2" size={30} />
                    <Gamepad2 className="floating-icon icon-3" size={35} />
                </div>
            </div>

            <motion.div
                className="auth-card"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className="auth-header">
                    <div className="auth-logo">
                        <div className="orbit-ring"></div>
                        <div className="orbit-core"></div>
                    </div>
                    <h1>ORBIT</h1>
                    <p className="auth-subtitle">Game Library Manager</p>
                </div>

                {/* Mode Title */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        className="auth-mode-header"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                    >
                        <h2>
                            {mode === 'login' && 'Bienvenido'}
                            {mode === 'register' && 'Crear cuenta'}
                            {mode === 'forgot' && 'Recuperar contraseña'}
                        </h2>
                        <p>
                            {mode === 'login' && 'Inicia sesión para acceder a tu biblioteca'}
                            {mode === 'register' && 'Únete a ORBIT y gestiona tus juegos'}
                            {mode === 'forgot' && 'Te enviaremos un email de recuperación'}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                className="auth-error"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <AlertCircle size={16} />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Validation Errors */}
                    <AnimatePresence>
                        {validationErrors.length > 0 && (
                            <motion.div
                                className="auth-validation-errors"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <div className="validation-header">
                                    <AlertCircle size={16} />
                                    <span>Por favor corrige los siguientes errores:</span>
                                </div>
                                <ul>
                                    {validationErrors.map((err, index) => (
                                        <li key={index}>{err}</li>
                                    ))}
                                </ul>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Success Message */}
                    <AnimatePresence>
                        {successMessage && (
                            <motion.div
                                className="auth-success"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <CheckCircle size={16} />
                                {successMessage}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Username (for login and register) */}
                    <AnimatePresence>
                        {(mode === 'login' || mode === 'register') && (
                            <motion.div
                                className="input-group"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <User size={18} className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="Nombre de usuario"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required={mode === 'login' || mode === 'register'}
                                    minLength={3}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Email (only for register and forgot) */}
                    <AnimatePresence>
                        {(mode === 'register' || mode === 'forgot') && (
                            <motion.div
                                className="input-group"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Mail size={18} className="input-icon" />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required={mode === 'register' || mode === 'forgot'}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Password (not for forgot) */}
                    <AnimatePresence>
                        {mode !== 'forgot' && (
                            <motion.div
                                className="input-group"
                                initial={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                            >
                                <Lock size={18} className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required={mode !== 'forgot'}
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                    <motion.button
                        type="submit"
                        className={`btn btn-primary auth-submit ${isProcessing ? 'processing' : ''}`}
                        disabled={isLoading || isProcessing}
                        whileHover={!isProcessing && !isLoading ? { scale: 1.02 } : {}}
                        whileTap={!isProcessing && !isLoading ? { scale: 0.98 } : {}}
                    >
                        {(isLoading || isProcessing) ? (
                            <>
                                <Loader2 size={20} className="spinner" />
                                {processingMessage || 'Cargando...'}
                            </>
                        ) : (
                            <>
                                {mode === 'login' && 'Iniciar sesión'}
                                {mode === 'register' && 'Crear cuenta'}
                                {mode === 'forgot' && 'Enviar email'}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </motion.button>

                    {/* Google Login (not for forgot) */}
                    {mode !== 'forgot' && (
                        <>
                            <div className="auth-divider">
                                <span>o continúa con</span>
                            </div>

                            <motion.button
                                type="button"
                                className="btn btn-google"
                                onClick={handleGoogleLogin}
                                disabled={isLoading || isProcessing}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                            </motion.button>
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

            {/* Features showcase */}
            <motion.div
                className="auth-features"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
            >
                <h3>Tu biblioteca de juegos, organizada</h3>
                <ul>
                    <li>
                        <Gamepad2 size={20} />
                        <span>Gestiona todos tus juegos en un solo lugar</span>
                    </li>
                    <li>
                        <Sparkles size={20} />
                        <span>Vincula Steam, Epic y más plataformas</span>
                    </li>
                    <li>
                        <CheckCircle size={20} />
                        <span>Sincroniza tu progreso en la nube</span>
                    </li>
                </ul>
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
        </div>
    );
}
