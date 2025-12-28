import { shell } from 'electron';
import axios from 'axios';
import http from 'http';
import { URL } from 'url';

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
            color: #ffffff;
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
        <p>Tu cuenta de Epic Games ha sido vinculada a ORBIT.</p>
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

export const epicAuthService = {
    async startEpicAuth(clientId, clientSecret) {
        if (!clientId || !clientSecret) {
            return { success: false, error: 'Credenciales de Epic no configuradas' };
        }

        const CLIENT_ID = clientId;
        const CLIENT_SECRET = clientSecret;
        const CALLBACK_PORT = 27894;
        const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`;
        const AUTH_URL = 'https://www.epicgames.com/id/authorize';
        const TOKEN_URL = 'https://api.epicgames.dev/epic/oauth/v2/token';

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
                const url = new URL(req.url || '', `http://localhost:${CALLBACK_PORT}`);

                if (url.pathname === '/callback') {
                    const code = url.searchParams.get('code');
                    const error = url.searchParams.get('error');

                    if (error) {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(getErrorHTML(`Epic Games devolvió un error: ${error}`));

                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeout);
                            server.close();
                            resolve({ success: false, error: `Epic error: ${error}` });
                        }
                        return;
                    }

                    if (code) {
                        try {
                            const tokenData = await this.exchangeCodeForToken(code, CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, TOKEN_URL);

                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(getSuccessHTML());

                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeout);
                                server.close();
                                resolve({ success: true, ...tokenData });
                            }
                        } catch (err) {
                            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                            res.end(getErrorHTML(err.message));

                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeout);
                                server.close();
                                resolve({ success: false, error: err.message });
                            }
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
                console.log(`Epic auth callback server listening on port ${CALLBACK_PORT}`);

                const authParams = new URLSearchParams({
                    client_id: CLIENT_ID,
                    response_type: 'code',
                    scope: 'basic_profile friends_list presence',
                    redirect_uri: REDIRECT_URI
                });

                const authUrl = `${AUTH_URL}?${authParams.toString()}`;
                console.log('Opening Epic auth URL in system browser:', authUrl);
                shell.openExternal(authUrl);
            });
        });
    },

    async exchangeCodeForToken(code, clientId, clientSecret, redirectUri, tokenUrl) {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri
        });

        const response = await axios.post(tokenUrl, params);
        return response.data;
    },

    async refreshToken(refreshToken, clientId, clientSecret) {
        const TOKEN_URL = 'https://api.epicgames.dev/epic/oauth/v2/token';
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret
        });

        const response = await axios.post(TOKEN_URL, params);
        return response.data;
    }
};
