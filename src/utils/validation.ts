// Validation utilities for ORBIT authentication

// ==========================================
// BLACKLISTED EMAIL DOMAINS (Temporary/Disposable)
// ==========================================
const BLACKLISTED_DOMAINS = [
    // Common temporary email services
    'tempmail.com',
    'temp-mail.org',
    'tempail.com',
    'tempr.email',
    'temp-mail.io',
    'tempmailo.com',
    'tempinbox.com',
    'fakeinbox.com',
    'guerrillamail.com',
    'guerrillamail.org',
    'guerrillamail.net',
    'guerrillamail.biz',
    'guerrillamail.de',
    'sharklasers.com',
    'grr.la',
    'pokemail.net',
    '10minutemail.com',
    '10minutemail.net',
    '10minmail.com',
    '10minemail.com',
    'minutemail.com',
    'mailinator.com',
    'mailinator2.com',
    'mailinater.com',
    'mailinator.net',
    'mailinator.org',
    'maildrop.cc',
    'getairmail.com',
    'getnada.com',
    'mohmal.com',
    'yopmail.com',
    'yopmail.fr',
    'yopmail.net',
    'cool.fr.nf',
    'jetable.fr.nf',
    'nospam.ze.tc',
    'nomail.xl.cx',
    'mega.zik.dj',
    'speed.1s.fr',
    'courriel.fr.nf',
    'moncourrier.fr.nf',
    'monemail.fr.nf',
    'monmail.fr.nf',
    'dispostable.com',
    'mailcatch.com',
    'mail-temporaire.fr',
    'filzmail.com',
    'mytrashmail.com',
    'trashmail.com',
    'trashmail.me',
    'trashmail.net',
    'trashemail.de',
    'trashmail.org',
    'uggsrock.com',
    'throwawaymail.com',
    'throwaway.email',
    'spamgourmet.com',
    'spam4.me',
    'spamfree24.org',
    'no-spam.ws',
    'mytempemail.com',
    'incognitomail.com',
    'inboxalias.com',
    'mintemail.com',
    'mailnesia.com',
    'tempmailaddress.com',
    'tempemailco.com',
    'fakemailgenerator.com',
    'emailondeck.com',
    'emailfake.com',
    'fakemail.net',
    'burnermail.io',
    'mailsac.com',
    'harakirimail.com',
    'discard.email',
    'discardmail.com',
    'discardmail.de',
    'spambox.us',
    'throwam.com',
    'mailexpire.com',
    'mailnull.com',
    'spamherelots.com',
    'thisisnotmyrealemail.com',
    'mailmetrash.com',
    'spamavert.com',
    'tempsky.com',
    'emlpro.com',
    'tempemail.net',
    'tempemails.io',
    '1secmail.com',
    '1secmail.net',
    '1secmail.org',
    'esiix.com',
    'wwjmp.com',
    'dcctb.com',
    'cdfaq.com',
    'vjuum.com',
    'laafd.com',
    'txcct.com',
    'emlhub.com',
    'fexpost.com',
    'fexbox.org',
    'fexbox.ru',
    'mailforspam.com',
    'tempmails.net',
    'tmpmail.org',
    'tmpmail.net',
    'mailpick.biz',
    'guerrillamailblock.com',
    'gamintor.com', // The one user has been using for testing
];

// ==========================================
// WHITELISTED EMAIL DOMAINS (Explicitly allowed)
// ==========================================
const WHITELISTED_DOMAINS = [
    // Google
    'gmail.com',
    'googlemail.com',
    // Microsoft
    'outlook.com',
    'outlook.es',
    'outlook.co.uk',
    'hotmail.com',
    'hotmail.es',
    'hotmail.co.uk',
    'live.com',
    'live.es',
    'msn.com',
    // Yahoo
    'yahoo.com',
    'yahoo.es',
    'yahoo.co.uk',
    'ymail.com',
    // Apple
    'icloud.com',
    'me.com',
    'mac.com',
    // Privacy-focused
    'protonmail.com',
    'proton.me',
    'pm.me',
    'protonmail.ch',
    'tutanota.com',
    'tutanota.de',
    'tuta.io',
    'onionmail.org',
    'onionmail.com',
    // Other major providers
    'zoho.com',
    'zohomail.com',
    'aol.com',
    'gmx.com',
    'gmx.net',
    'gmx.de',
    'mail.com',
    'email.com',
    'fastmail.com',
    'fastmail.fm',
    'hushmail.com',
    'runbox.com',
    'mailfence.com',
    'disroot.org',
    'riseup.net',
    'posteo.de',
    'posteo.net',
    'mailbox.org',
    'kolabnow.com',
    'startmail.com',
    'ctemplar.com',
    // Regional/Country specific
    'web.de',
    'freenet.de',
    'orange.fr',
    'laposte.net',
    'libero.it',
    'virgilio.it',
    'alice.it',
    'terra.com.br',
    'uol.com.br',
    'bol.com.br',
    'ig.com.br',
    // Education & Work domains (allow any .edu, .gov, etc)
    // These are handled separately in validation
];

// Educational and organizational TLDs that are always allowed
const ALLOWED_TLDS = [
    '.edu',
    '.gov',
    '.org',
    '.ac.uk',
    '.edu.es',
    '.gob.es',
];

// ==========================================
// EMAIL VALIDATION
// ==========================================
export interface EmailValidationResult {
    isValid: boolean;
    error?: string;
}

export function validateEmail(email: string): EmailValidationResult {
    // Basic format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { isValid: false, error: 'Formato de email inválido' };
    }

    const domain = email.split('@')[1].toLowerCase();

    // Check if it's in the blacklist
    if (BLACKLISTED_DOMAINS.includes(domain)) {
        return {
            isValid: false,
            error: 'No se permiten correos temporales o desechables. Usa un email permanente.'
        };
    }

    // Check if it's in the whitelist or has an allowed TLD
    const isWhitelisted = WHITELISTED_DOMAINS.includes(domain);
    const hasAllowedTLD = ALLOWED_TLDS.some(tld => domain.endsWith(tld));

    // For non-whitelisted domains, we allow them but could add extra checks
    // This allows custom domains from companies, personal domains, etc.
    if (!isWhitelisted && !hasAllowedTLD) {
        // Additional check: if domain looks suspicious (too short, weird patterns)
        if (domain.length < 5 || /^[a-z]{5}\.(com|net|org)$/.test(domain)) {
            return {
                isValid: false,
                error: 'Este dominio de email no está permitido. Usa un proveedor de email conocido.'
            };
        }
    }

    return { isValid: true };
}

// ==========================================
// PASSWORD VALIDATION
// ==========================================
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
}

export interface PasswordRequirements {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    noSpaces: boolean;
}

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let strengthScore = 0;

    const requirements: PasswordRequirements = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        noSpaces: !/\s/.test(password),
    };

    // Check minimum length (required)
    if (!requirements.minLength) {
        errors.push('Mínimo 8 caracteres');
    } else {
        strengthScore += 1;
    }

    // Check for uppercase (required)
    if (!requirements.hasUppercase) {
        errors.push('Al menos una letra mayúscula');
    } else {
        strengthScore += 1;
    }

    // Check for lowercase (required)
    if (!requirements.hasLowercase) {
        errors.push('Al menos una letra minúscula');
    } else {
        strengthScore += 1;
    }

    // Check for numbers (required)
    if (!requirements.hasNumber) {
        errors.push('Al menos un número');
    } else {
        strengthScore += 1;
    }

    // Check for special characters (optional but recommended)
    if (requirements.hasSpecialChar) {
        strengthScore += 1;
    }

    // Check for spaces
    if (!requirements.noSpaces) {
        errors.push('No se permiten espacios');
    }

    // Extra strength for longer passwords
    if (password.length >= 12) strengthScore += 1;
    if (password.length >= 16) strengthScore += 1;

    // Determine strength
    let strength: 'weak' | 'medium' | 'strong';
    if (strengthScore <= 3) {
        strength = 'weak';
    } else if (strengthScore <= 5) {
        strength = 'medium';
    } else {
        strength = 'strong';
    }

    return {
        isValid: errors.length === 0,
        errors,
        strength,
    };
}

export function getPasswordRequirements(password: string): PasswordRequirements {
    return {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        noSpaces: !/\s/.test(password),
    };
}

// ==========================================
// USERNAME VALIDATION
// ==========================================
export interface UsernameValidationResult {
    isValid: boolean;
    error?: string;
}

export function validateUsername(username: string): UsernameValidationResult {
    // Minimum length
    if (username.length < 3) {
        return { isValid: false, error: 'Mínimo 3 caracteres' };
    }

    // Maximum length
    if (username.length > 20) {
        return { isValid: false, error: 'Máximo 20 caracteres' };
    }

    // Only alphanumeric and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { isValid: false, error: 'Solo letras, números y guiones bajos' };
    }

    // Must start with a letter
    if (!/^[a-zA-Z]/.test(username)) {
        return { isValid: false, error: 'Debe comenzar con una letra' };
    }

    // Reserved usernames
    const reservedUsernames = [
        'admin', 'administrator', 'root', 'system', 'orbit',
        'moderator', 'mod', 'staff', 'support', 'help',
        'null', 'undefined', 'anonymous', 'guest', 'user'
    ];

    if (reservedUsernames.includes(username.toLowerCase())) {
        return { isValid: false, error: 'Este nombre de usuario está reservado' };
    }

    return { isValid: true };
}
