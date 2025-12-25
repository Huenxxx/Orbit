// Steam Local Service - Detects Steam installation and games on the local system
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// Common Steam installation paths on Windows
const STEAM_PATHS = [
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
    'D:\\Steam',
    'D:\\SteamLibrary',
    'E:\\Steam',
    'E:\\SteamLibrary'
];

/**
 * Find Steam installation directory
 */
async function findSteamPath() {
    // First try to get from registry
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Valve\\Steam" /v InstallPath',
            { encoding: 'utf8' }
        );
        const match = stdout.match(/InstallPath\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            const steamPath = match[1].trim();
            try {
                await fs.access(steamPath);
                return steamPath;
            } catch { }
        }
    } catch (e) {
        // Registry key not found, try common paths
    }

    // Try common paths
    for (const steamPath of STEAM_PATHS) {
        try {
            await fs.access(steamPath);
            const steamExe = path.join(steamPath, 'steam.exe');
            await fs.access(steamExe);
            return steamPath;
        } catch { }
    }

    return null;
}

/**
 * Get the currently logged in Steam user from Steam's config
 */
async function getLoggedInUser(steamPath) {
    try {
        const loginUsersPath = path.join(steamPath, 'config', 'loginusers.vdf');
        const content = await fs.readFile(loginUsersPath, 'utf8');

        // Parse VDF format to find the most recent user
        const users = [];
        const userBlocks = content.match(/"(\d{17})"\s*\{[^}]+\}/g);

        if (userBlocks) {
            for (const block of userBlocks) {
                const steamIdMatch = block.match(/"(\d{17})"/);
                const nameMatch = block.match(/"PersonaName"\s+"([^"]+)"/);
                const timestampMatch = block.match(/"Timestamp"\s+"(\d+)"/);
                const mostRecentMatch = block.match(/"MostRecent"\s+"(\d+)"/);

                if (steamIdMatch) {
                    users.push({
                        steamId: steamIdMatch[1],
                        personaName: nameMatch ? nameMatch[1] : 'Steam User',
                        timestamp: timestampMatch ? parseInt(timestampMatch[1]) : 0,
                        mostRecent: mostRecentMatch ? mostRecentMatch[1] === '1' : false
                    });
                }
            }
        }

        // Sort by most recent or timestamp
        users.sort((a, b) => {
            if (a.mostRecent && !b.mostRecent) return -1;
            if (!a.mostRecent && b.mostRecent) return 1;
            return b.timestamp - a.timestamp;
        });

        return users[0] || null;
    } catch (error) {
        console.error('Error reading Steam login users:', error);
        return null;
    }
}

/**
 * Get all Steam library folders (where games can be installed)
 */
async function getLibraryFolders(steamPath) {
    const folders = [steamPath];

    try {
        const libraryFoldersPath = path.join(steamPath, 'steamapps', 'libraryfolders.vdf');
        const content = await fs.readFile(libraryFoldersPath, 'utf8');

        // Parse VDF to find additional library paths
        const pathMatches = content.matchAll(/"path"\s+"([^"]+)"/g);
        for (const match of pathMatches) {
            const libPath = match[1].replace(/\\\\/g, '\\');
            if (!folders.includes(libPath)) {
                folders.push(libPath);
            }
        }
    } catch (error) {
        console.error('Error reading library folders:', error);
    }

    return folders;
}

/**
 * Parse ACF (App Cache File) to get game info
 */
async function parseAcfFile(acfPath) {
    try {
        const content = await fs.readFile(acfPath, 'utf8');

        const appIdMatch = content.match(/"appid"\s+"(\d+)"/);
        const nameMatch = content.match(/"name"\s+"([^"]+)"/);
        const installDirMatch = content.match(/"installdir"\s+"([^"]+)"/);
        const sizeMatch = content.match(/"SizeOnDisk"\s+"(\d+)"/);
        const lastUpdatedMatch = content.match(/"LastUpdated"\s+"(\d+)"/);
        const buildIdMatch = content.match(/"buildid"\s+"(\d+)"/);

        if (appIdMatch && nameMatch) {
            return {
                appid: parseInt(appIdMatch[1]),
                name: nameMatch[1],
                installdir: installDirMatch ? installDirMatch[1] : null,
                sizeOnDisk: sizeMatch ? parseInt(sizeMatch[1]) : 0,
                lastUpdated: lastUpdatedMatch ? parseInt(lastUpdatedMatch[1]) : 0,
                buildId: buildIdMatch ? buildIdMatch[1] : null
            };
        }
    } catch (error) {
        // File might not be readable
    }
    return null;
}

/**
 * Get all installed Steam games
 */
async function getInstalledGames(steamPath) {
    const installedGames = [];
    const libraryFolders = await getLibraryFolders(steamPath);

    for (const libraryPath of libraryFolders) {
        const steamappsPath = path.join(libraryPath, 'steamapps');

        try {
            const files = await fs.readdir(steamappsPath);
            const acfFiles = files.filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'));

            for (const acfFile of acfFiles) {
                const gameInfo = await parseAcfFile(path.join(steamappsPath, acfFile));
                if (gameInfo) {
                    // Calculate the full install path
                    if (gameInfo.installdir) {
                        gameInfo.installPath = path.join(steamappsPath, 'common', gameInfo.installdir);
                    }
                    gameInfo.libraryPath = libraryPath;
                    installedGames.push(gameInfo);
                }
            }
        } catch (error) {
            // Library path might not exist
        }
    }

    return installedGames;
}

/**
 * Launch a Steam game by its app ID
 */
function launchSteamGame(appId) {
    // Use Steam's protocol to launch games
    const steamUrl = `steam://rungameid/${appId}`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${steamUrl}"`, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve({ success: true });
            }
        });
    });
}

/**
 * Open Steam store page for a game
 */
function openStorePage(appId) {
    const storeUrl = `steam://store/${appId}`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${storeUrl}"`, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve({ success: true });
            }
        });
    });
}

/**
 * Install a Steam game by its app ID
 */
function installSteamGame(appId) {
    const installUrl = `steam://install/${appId}`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${installUrl}"`, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve({ success: true });
            }
        });
    });
}

/**
 * Open Steam and trigger login
 */
function openSteamLogin() {
    return new Promise((resolve, reject) => {
        exec(`start "" "steam://open/main"`, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve({ success: true });
            }
        });
    });
}

/**
 * Check if Steam is running
 */
async function isSteamRunning() {
    try {
        const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq steam.exe" /NH');
        return stdout.toLowerCase().includes('steam.exe');
    } catch {
        return false;
    }
}

/**
 * Get complete Steam info
 */
async function getSteamInfo() {
    const steamPath = await findSteamPath();

    if (!steamPath) {
        return {
            success: false,
            error: 'Steam no está instalado o no se pudo encontrar',
            steamInstalled: false
        };
    }

    const user = await getLoggedInUser(steamPath);
    const installedGames = await getInstalledGames(steamPath);
    const isRunning = await isSteamRunning();

    return {
        success: true,
        steamInstalled: true,
        steamPath,
        isRunning,
        user,
        installedGames: installedGames.map(game => ({
            ...game,
            headerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
            capsuleUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/capsule_231x87.jpg`,
            isInstalled: true
        }))
    };
}

export const steamLocalService = {
    findSteamPath,
    getLoggedInUser,
    getInstalledGames,
    getLibraryFolders,
    launchSteamGame,
    openStorePage,
    installSteamGame,
    openSteamLogin,
    isSteamRunning,
    getSteamInfo
};
