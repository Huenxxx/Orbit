// Steam OpenID Authentication Service
// Uses system browser + local HTTP server for authentication

import { shell } from 'electron';
import http from 'http';
import { URL } from 'url';

// Steam OpenID endpoint
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

// Local callback server port
const CALLBACK_PORT = 27893;
const RETURN_TO = `http://localhost:${CALLBACK_PORT}/callback`;
const REALM = `http://localhost:${CALLBACK_PORT}`;

/**
 * Extracts Steam ID64 from the OpenID claimed_id
 * @param {string} claimedId - The claimed_id from Steam OpenID response
 * @returns {string|null} - The Steam ID64 or null if invalid
 */
function extractSteamId(claimedId) {
    // claimed_id format: https://steamcommunity.com/openid/id/76561198012345678
    const match = claimedId.match(/\/openid\/id\/(\d+)$/);
    return match ? match[1] : null;
}

/**
 * Builds the Steam OpenID authentication URL
 * @returns {string} - The complete OpenID authentication URL
 */
function buildAuthUrl() {
    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': RETURN_TO,
        'openid.realm': REALM,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    });

    return `${STEAM_OPENID_URL}?${params.toString()}`;
}

/**
 * Validates the OpenID response from Steam
 * @param {URLSearchParams} params - The callback URL parameters
 * @returns {Promise<boolean>} - Whether the response is valid
 */
async function validateOpenIdResponse(params) {
    // Create validation request
    const validationParams = new URLSearchParams();

    // Copy all openid params and change mode to check_authentication
    for (const [key, value] of params.entries()) {
        if (key.startsWith('openid.')) {
            validationParams.set(key, value);
        }
    }
    validationParams.set('openid.mode', 'check_authentication');

    try {
        const response = await fetch(STEAM_OPENID_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: validationParams.toString()
        });

        const text = await response.text();
        return text.includes('is_valid:true');
    } catch (error) {
        console.error('OpenID validation error:', error);
        return false;
    }
}

/**
 * Creates a success HTML page
 */
function getSuccessHTML() {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ORBIT - Autenticación exitosa</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            padding: 40px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: #66c0f4;
            margin-bottom: 10px;
        }
        p {
            color: #8b949e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✓</div>
        <h1>¡Autenticación exitosa!</h1>
        <p>Tu cuenta de Steam ha sido vinculada a ORBIT.</p>
        <p>Puedes cerrar esta ventana.</p>
    </div>
</body>
</html>`;
}

/**
 * Creates an error HTML page
 */
function getErrorHTML(error) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ORBIT - Error de autenticación</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
        }
        .container {
            padding: 40px;
        }
        .icon {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: #ef4444;
            margin-bottom: 10px;
        }
        p {
            color: #8b949e;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">✕</div>
        <h1>Error de autenticación</h1>
        <p>${error}</p>
        <p>Puedes cerrar esta ventana e intentarlo de nuevo.</p>
    </div>
</body>
</html>`;
}

/**
 * Starts the Steam OpenID authentication flow
 * Opens system browser for Steam login and waits for callback
 * @returns {Promise<{success: boolean, steamId?: string, error?: string}>}
 */
async function startSteamAuth() {
    return new Promise((resolve) => {
        let resolved = false;
        let server = null;

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                if (server) server.close();
                resolve({ success: false, error: 'Tiempo de espera agotado' });
            }
        }, 5 * 60 * 1000);

        // Create local HTTP server to capture callback
        server = http.createServer(async (req, res) => {
            const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);

            if (url.pathname === '/callback') {
                const params = url.searchParams;
                const mode = params.get('openid.mode');

                if (mode === 'cancel') {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(getErrorHTML('Autenticación cancelada'));

                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        server.close();
                        resolve({ success: false, error: 'Autenticación cancelada' });
                    }
                    return;
                }

                if (mode === 'id_res') {
                    // Validate the response
                    const isValid = await validateOpenIdResponse(params);

                    if (!isValid) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(getErrorHTML('Respuesta de Steam no válida'));

                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            server.close();
                            resolve({ success: false, error: 'Respuesta de Steam no válida' });
                        }
                        return;
                    }

                    // Extract Steam ID
                    const claimedId = params.get('openid.claimed_id');
                    const steamId = extractSteamId(claimedId);

                    if (!steamId) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(getErrorHTML('No se pudo obtener el Steam ID'));

                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            server.close();
                            resolve({ success: false, error: 'No se pudo obtener el Steam ID' });
                        }
                        return;
                    }

                    // Success!
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(getSuccessHTML());

                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        server.close();
                        resolve({ success: true, steamId });
                    }
                    return;
                }
            }

            // Default response
            res.writeHead(404);
            res.end('Not Found');
        });

        server.on('error', (err) => {
            console.error('Server error:', err);
            if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                resolve({ success: false, error: `Error del servidor: ${err.message}` });
            }
        });

        // Start server and open browser
        server.listen(CALLBACK_PORT, () => {
            console.log(`Steam auth callback server listening on port ${CALLBACK_PORT}`);

            // Open Steam login in system browser
            const authUrl = buildAuthUrl();
            console.log('Opening Steam auth URL in system browser:', authUrl);
            shell.openExternal(authUrl);
        });
    });
}

export const steamAuthService = {
    startSteamAuth,
    extractSteamId,
    validateOpenIdResponse
};
