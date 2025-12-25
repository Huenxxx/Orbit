import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

// Store verification codes (in production, use a proper database)
const verificationCodes = new Map();

// Create transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // STARTTLS
        auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

// Generate verification code
const generateVerificationCode = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 character code
};

// Email templates
const getWelcomeEmailTemplate = (username) => {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>¡Bienvenido a ORBIT!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(145deg, #13131a 0%, #1a1a25 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(125, 95, 255, 0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, rgba(125, 95, 255, 0.2) 0%, rgba(159, 122, 234, 0.1) 100%);">
                            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #7d5fff 0%, #9f7aea 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 36px;">🚀</span>
                            </div>
                            <h1 style="margin: 0; font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #7d5fff 0%, #a78bfa 50%, #c4b5fd 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                                ¡Bienvenido a ORBIT!
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 18px; color: #e4e4e7; line-height: 1.6;">
                                ¡Hola <strong style="color: #a78bfa;">${username}</strong>! 🎮
                            </p>
                            <p style="margin: 0 0 25px 0; font-size: 16px; color: #a1a1aa; line-height: 1.8;">
                                ¡Enhorabuena por registrarte en <strong style="color: #7d5fff;">ORBIT</strong>! Ahora eres parte de la comunidad de gamers que han encontrado el centro de gravedad para todos sus juegos.
                            </p>
                            
                            <!-- Features Box -->
                            <div style="background: rgba(125, 95, 255, 0.1); border-radius: 15px; padding: 25px; margin: 25px 0; border: 1px solid rgba(125, 95, 255, 0.2);">
                                <p style="margin: 0 0 15px 0; font-size: 16px; color: #e4e4e7; font-weight: 600;">
                                    Con ORBIT podrás:
                                </p>
                                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">
                                            <span style="color: #7d5fff; margin-right: 10px;">✦</span>
                                            Gestionar toda tu biblioteca de juegos en un solo lugar
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">
                                            <span style="color: #7d5fff; margin-right: 10px;">✦</span>
                                            Sincronizar tus juegos de Steam, Epic Games y más
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">
                                            <span style="color: #7d5fff; margin-right: 10px;">✦</span>
                                            Desbloquear logros exclusivos de ORBIT
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">
                                            <span style="color: #7d5fff; margin-right: 10px;">✦</span>
                                            Guardar tu progreso en la nube
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style="margin: 25px 0; font-size: 16px; color: #a1a1aa; line-height: 1.8;">
                                ¿Listo para empezar? ¡Abre ORBIT y comienza a organizar tu colección de juegos!
                            </p>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="#" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #7d5fff 0%, #9f7aea 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 20px rgba(125, 95, 255, 0.4);">
                                    🎮 Comenzar a jugar
                                </a>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(125, 95, 255, 0.2);">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #71717a; text-align: center;">
                                ¿Tienes preguntas? Estamos aquí para ayudarte.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                                © 2024 ORBIT - El centro de gravedad de todos tus juegos
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

const getVerificationEmailTemplate = (username, code) => {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verifica tu correo - ORBIT</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0f;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background: linear-gradient(145deg, #13131a 0%, #1a1a25 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 20px 60px rgba(125, 95, 255, 0.15);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, rgba(125, 95, 255, 0.2) 0%, rgba(159, 122, 234, 0.1) 100%);">
                            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #7d5fff 0%, #9f7aea 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span style="font-size: 36px;">✉️</span>
                            </div>
                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #e4e4e7;">
                                Verifica tu correo electrónico
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 18px; color: #e4e4e7; line-height: 1.6;">
                                ¡Hola <strong style="color: #a78bfa;">${username}</strong>! 👋
                            </p>
                            <p style="margin: 0 0 25px 0; font-size: 16px; color: #a1a1aa; line-height: 1.8;">
                                Para completar tu registro en <strong style="color: #7d5fff;">ORBIT</strong> y comenzar a disfrutar de todas las funciones, necesitamos verificar tu correo electrónico.
                            </p>
                            
                            <!-- Verification Code Box -->
                            <div style="background: rgba(125, 95, 255, 0.15); border-radius: 15px; padding: 30px; margin: 30px 0; text-align: center; border: 2px solid rgba(125, 95, 255, 0.3);">
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 2px;">
                                    Tu código de verificación
                                </p>
                                <div style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #7d5fff; font-family: 'Courier New', monospace; text-shadow: 0 0 20px rgba(125, 95, 255, 0.5);">
                                    ${code}
                                </div>
                                <p style="margin: 20px 0 0 0; font-size: 13px; color: #71717a;">
                                    Este código expira en <strong style="color: #a78bfa;">15 minutos</strong>
                                </p>
                            </div>
                            
                            <p style="margin: 25px 0; font-size: 16px; color: #a1a1aa; line-height: 1.8;">
                                Ingresa este código en ORBIT para verificar tu cuenta y desbloquear todas las características.
                            </p>
                            
                            <!-- Warning Box -->
                            <div style="background: rgba(251, 191, 36, 0.1); border-radius: 12px; padding: 15px 20px; margin: 20px 0; border-left: 4px solid #fbbf24;">
                                <p style="margin: 0; font-size: 13px; color: #fbbf24;">
                                    ⚠️ Si no solicitaste este código, puedes ignorar este correo de forma segura.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(125, 95, 255, 0.2);">
                            <p style="margin: 0 0 10px 0; font-size: 14px; color: #71717a; text-align: center;">
                                Este es un correo automático de verificación.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #52525b; text-align: center;">
                                © 2024 ORBIT - El centro de gravedad de todos tus juegos
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

// Email Service Class
class EmailService {
    constructor() {
        this.transporter = null;
    }

    async initialize() {
        try {
            this.transporter = createTransporter();
            // Verify connection
            await this.transporter.verify();
            console.log('✅ Email service initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Email service initialization failed:', error.message);
            return false;
        }
    }

    async sendWelcomeEmail(email, username) {
        if (!this.transporter) {
            await this.initialize();
        }

        try {
            const mailOptions = {
                from: `"ORBIT 🚀" <${process.env.SMTP_FROM}>`,
                to: email,
                subject: '🎮 ¡Bienvenido a ORBIT! - Tu aventura comienza ahora',
                html: getWelcomeEmailTemplate(username)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent to:', email);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error.message);
            return { success: false, error: error.message };
        }
    }

    async sendVerificationEmail(email, username) {
        if (!this.transporter) {
            await this.initialize();
        }

        const code = generateVerificationCode();

        // Store the code with expiration (15 minutes)
        verificationCodes.set(email, {
            code,
            username,
            expiresAt: Date.now() + 15 * 60 * 1000,
            attempts: 0
        });

        try {
            const mailOptions = {
                from: `"ORBIT 🚀" <${process.env.SMTP_FROM}>`,
                to: email,
                subject: '🔐 Verifica tu correo electrónico - ORBIT',
                html: getVerificationEmailTemplate(username, code)
            };

            const result = await this.transporter.sendMail(mailOptions);
            console.log('✅ Verification email sent to:', email);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('❌ Failed to send verification email:', error.message);
            return { success: false, error: error.message };
        }
    }

    verifyCode(email, code) {
        const stored = verificationCodes.get(email);

        if (!stored) {
            return { success: false, error: 'No se encontró código de verificación' };
        }

        if (Date.now() > stored.expiresAt) {
            verificationCodes.delete(email);
            return { success: false, error: 'El código ha expirado' };
        }

        stored.attempts++;

        if (stored.attempts > 5) {
            verificationCodes.delete(email);
            return { success: false, error: 'Demasiados intentos. Solicita un nuevo código' };
        }

        if (stored.code.toUpperCase() !== code.toUpperCase()) {
            return { success: false, error: 'Código incorrecto' };
        }

        // Success - remove the code
        verificationCodes.delete(email);
        return { success: true };
    }

    async resendVerificationEmail(email, username) {
        // Remove old code if exists
        verificationCodes.delete(email);
        return this.sendVerificationEmail(email, username);
    }
}

export const emailService = new EmailService();
export default emailService;
