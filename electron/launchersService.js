// Multi-Platform Game Launcher Service
// Detects Epic Games, GOG Galaxy, and EA App installations and games

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// ============================================
// EPIC GAMES LAUNCHER
// ============================================

const EPIC_PATHS = [
    'C:\\Program Files\\Epic Games',
    'C:\\Program Files (x86)\\Epic Games',
    'D:\\Epic Games',
    'E:\\Epic Games'
];

const EPIC_LAUNCHER_PATHS = [
    process.env.LOCALAPPDATA + '\\EpicGamesLauncher',
    'C:\\Program Files (x86)\\Epic Games\\Launcher',
    'C:\\Program Files\\Epic Games\\Launcher'
];

/**
 * Find Epic Games Launcher installation
 */
async function findEpicPath() {
    // Try registry first
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Epic Games\\EpicGamesLauncher" /v AppDataPath',
            { encoding: 'utf8' }
        );
        const match = stdout.match(/AppDataPath\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            return match[1].trim();
        }
    } catch (e) {
        // Registry not found
    }

    // Try common paths
    for (const epicPath of EPIC_LAUNCHER_PATHS) {
        try {
            await fs.access(epicPath);
            return epicPath;
        } catch { }
    }

    return null;
}

/**
 * Get installed Epic Games from manifest files
 */
async function getEpicInstalledGames() {
    const games = [];

    // Epic stores manifests in ProgramData
    const manifestPath = 'C:\\ProgramData\\Epic\\EpicGamesLauncher\\Data\\Manifests';

    try {
        const files = await fs.readdir(manifestPath);
        const itemFiles = files.filter(f => f.endsWith('.item'));

        for (const file of itemFiles) {
            try {
                const content = await fs.readFile(path.join(manifestPath, file), 'utf8');
                const manifest = JSON.parse(content);

                if (manifest.DisplayName && manifest.InstallLocation) {
                    games.push({
                        id: manifest.AppName || manifest.CatalogItemId,
                        name: manifest.DisplayName,
                        installPath: manifest.InstallLocation,
                        launchCommand: manifest.LaunchCommand || '',
                        executable: manifest.LaunchExecutable || '',
                        namespace: manifest.CatalogNamespace || '',
                        version: manifest.AppVersionString || '',
                        sizeOnDisk: manifest.InstallSize || 0,
                        isInstalled: true,
                        platform: 'epic'
                    });
                }
            } catch (e) {
                // Skip invalid manifest
            }
        }
    } catch (error) {
        console.error('Error reading Epic manifests:', error);
    }

    return games;
}

/**
 * Launch an Epic Games game
 */
function launchEpicGame(appName) {
    const launchUrl = `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${launchUrl}"`, (error) => {
            if (error) reject(error);
            else resolve({ success: true });
        });
    });
}

/**
 * Open Epic Games Store page
 */
function openEpicStore(appName) {
    const storeUrl = `com.epicgames.launcher://store/product/${appName}`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${storeUrl}"`, (error) => {
            if (error) reject(error);
            else resolve({ success: true });
        });
    });
}

/**
 * Get Epic Games info
 */
async function getEpicInfo() {
    const launcherPath = await findEpicPath();
    const installedGames = await getEpicInstalledGames();

    return {
        success: true,
        installed: launcherPath !== null,
        launcherPath,
        games: installedGames,
        gameCount: installedGames.length
    };
}

// ============================================
// GOG GALAXY
// ============================================

const GOG_PATHS = [
    'C:\\Program Files (x86)\\GOG Galaxy',
    'C:\\Program Files\\GOG Galaxy',
    'D:\\GOG Galaxy',
    'E:\\GOG Galaxy'
];

/**
 * Find GOG Galaxy installation
 */
async function findGogPath() {
    // Try registry
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\GalaxyClient\\paths" /v client',
            { encoding: 'utf8' }
        );
        const match = stdout.match(/client\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            return match[1].trim();
        }
    } catch (e) { }

    // Try common paths
    for (const gogPath of GOG_PATHS) {
        try {
            await fs.access(path.join(gogPath, 'GalaxyClient.exe'));
            return gogPath;
        } catch { }
    }

    return null;
}

/**
 * Get installed GOG games from database
 */
async function getGogInstalledGames() {
    const games = [];

    // GOG stores game info in ProgramData
    const gogDataPath = 'C:\\ProgramData\\GOG.com\\Galaxy\\storage\\galaxy-2.0.db';
    const gogGamesPath = process.env.LOCALAPPDATA + '\\GOG.com\\Galaxy\\Configuration\\InfoProviders\\GOG.ini';

    // Alternative: Read from installed games folder
    const gogGameFolders = [
        'C:\\GOG Games',
        'D:\\GOG Games',
        'C:\\Program Files (x86)\\GOG Galaxy\\Games',
        'C:\\Program Files\\GOG Galaxy\\Games'
    ];

    // Try to read from registry for installed games
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\Games" /s',
            { encoding: 'utf8' }
        );

        // Parse registry output to find games
        const gameBlocks = stdout.split(/HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG\.com\\Games\\/);

        for (const block of gameBlocks) {
            if (!block.trim()) continue;

            const gameIdMatch = block.match(/^(\d+)/);
            const nameMatch = block.match(/GAMENAME\s+REG_SZ\s+(.+)/i);
            const pathMatch = block.match(/PATH\s+REG_SZ\s+(.+)/i) || block.match(/EXE\s+REG_SZ\s+(.+)/i);
            const exeMatch = block.match(/EXE\s+REG_SZ\s+(.+)/i);

            if (gameIdMatch && nameMatch) {
                games.push({
                    id: gameIdMatch[1],
                    name: nameMatch[1].trim(),
                    installPath: pathMatch ? path.dirname(pathMatch[1].trim()) : '',
                    executable: exeMatch ? exeMatch[1].trim() : '',
                    isInstalled: true,
                    platform: 'gog'
                });
            }
        }
    } catch (e) {
        // Registry not accessible
    }

    // Scan game folders as fallback
    if (games.length === 0) {
        for (const folder of gogGameFolders) {
            try {
                const dirs = await fs.readdir(folder);
                for (const dir of dirs) {
                    const gamePath = path.join(folder, dir);
                    const stat = await fs.stat(gamePath);
                    if (stat.isDirectory()) {
                        // Check for goggame-*.info files
                        try {
                            const files = await fs.readdir(gamePath);
                            const infoFile = files.find(f => f.startsWith('goggame-') && f.endsWith('.info'));
                            if (infoFile) {
                                const infoContent = await fs.readFile(path.join(gamePath, infoFile), 'utf8');
                                const info = JSON.parse(infoContent);
                                games.push({
                                    id: info.gameId || infoFile.replace('goggame-', '').replace('.info', ''),
                                    name: info.name || dir,
                                    installPath: gamePath,
                                    executable: info.playTasks?.[0]?.path || '',
                                    isInstalled: true,
                                    platform: 'gog'
                                });
                            }
                        } catch { }
                    }
                }
            } catch { }
        }
    }

    return games;
}

/**
 * Launch a GOG game
 */
function launchGogGame(gameId) {
    const launchUrl = `goggalaxy://runGame/${gameId}`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${launchUrl}"`, (error) => {
            if (error) reject(error);
            else resolve({ success: true });
        });
    });
}

/**
 * Get GOG Galaxy info
 */
async function getGogInfo() {
    const launcherPath = await findGogPath();
    const installedGames = await getGogInstalledGames();

    return {
        success: true,
        installed: launcherPath !== null,
        launcherPath,
        games: installedGames,
        gameCount: installedGames.length
    };
}

// ============================================
// EA APP (formerly Origin)
// ============================================

const EA_PATHS = [
    'C:\\Program Files\\Electronic Arts',
    'C:\\Program Files (x86)\\Origin',
    'C:\\Program Files\\EA Desktop',
    'C:\\Program Files (x86)\\EA Desktop',
    process.env.LOCALAPPDATA + '\\Electronic Arts',
    process.env.LOCALAPPDATA + '\\Origin'
];

/**
 * Find EA App installation
 */
async function findEaPath() {
    // Try EA App first (newer)
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Electronic Arts\\EA Desktop" /v InstallLocation',
            { encoding: 'utf8' }
        );
        const match = stdout.match(/InstallLocation\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            return { path: match[1].trim(), launcher: 'ea' };
        }
    } catch (e) { }

    // Try Origin as fallback
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Origin" /v ClientPath',
            { encoding: 'utf8' }
        );
        const match = stdout.match(/ClientPath\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            return { path: path.dirname(match[1].trim()), launcher: 'origin' };
        }
    } catch (e) { }

    // Try common paths
    for (const eaPath of EA_PATHS) {
        try {
            await fs.access(eaPath);
            return { path: eaPath, launcher: 'ea' };
        } catch { }
    }

    return null;
}

/**
 * Get installed EA/Origin games
 */
async function getEaInstalledGames() {
    const games = [];

    // EA App stores game info in LocalContent
    const eaContentPath = 'C:\\ProgramData\\EA Desktop\\LocalContent';
    const originContentPath = 'C:\\ProgramData\\Origin\\LocalContent';

    const contentPaths = [eaContentPath, originContentPath];

    for (const contentPath of contentPaths) {
        try {
            const dirs = await fs.readdir(contentPath);

            for (const dir of dirs) {
                const gamePath = path.join(contentPath, dir);
                const stat = await fs.stat(gamePath);

                if (stat.isDirectory()) {
                    // Look for __Installer manifest
                    try {
                        const installerPath = path.join(gamePath, '__Installer');
                        const files = await fs.readdir(installerPath);
                        const manifestFile = files.find(f => f.endsWith('.mfst'));

                        if (manifestFile) {
                            const manifestContent = await fs.readFile(
                                path.join(installerPath, manifestFile),
                                'utf8'
                            );

                            // Parse manifest (it's in a custom format)
                            const idMatch = manifestContent.match(/id=([^\r\n&]+)/);

                            games.push({
                                id: idMatch ? idMatch[1] : dir,
                                name: dir.replace(/_/g, ' '),
                                installPath: gamePath,
                                isInstalled: true,
                                platform: 'ea'
                            });
                        }
                    } catch { }
                }
            }
        } catch { }
    }

    // Also check for games in standard EA Games folder
    const eaGamesFolders = [
        'C:\\Program Files\\EA Games',
        'C:\\Program Files (x86)\\EA Games',
        'D:\\EA Games',
        'C:\\Program Files\\Electronic Arts',
        'C:\\Program Files (x86)\\Electronic Arts'
    ];

    for (const folder of eaGamesFolders) {
        try {
            const dirs = await fs.readdir(folder);
            for (const dir of dirs) {
                const gamePath = path.join(folder, dir);
                const stat = await fs.stat(gamePath);
                if (stat.isDirectory() && !games.find(g => g.name === dir)) {
                    games.push({
                        id: dir.toLowerCase().replace(/\s+/g, '-'),
                        name: dir,
                        installPath: gamePath,
                        isInstalled: true,
                        platform: 'ea'
                    });
                }
            }
        } catch { }
    }

    return games;
}

/**
 * Launch an EA/Origin game
 */
function launchEaGame(gameId) {
    // Try EA App first, fallback to Origin
    const launchUrl = `origin://launchgame/${gameId}`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${launchUrl}"`, (error) => {
            if (error) reject(error);
            else resolve({ success: true });
        });
    });
}

/**
 * Get EA App info
 */
async function getEaInfo() {
    const launcherInfo = await findEaPath();
    const installedGames = await getEaInstalledGames();

    return {
        success: true,
        installed: launcherInfo !== null,
        launcherPath: launcherInfo?.path || null,
        launcherType: launcherInfo?.launcher || null,
        games: installedGames,
        gameCount: installedGames.length
    };
}

// ============================================
// UBISOFT CONNECT (Bonus)
// ============================================

const UBISOFT_PATHS = [
    'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher',
    'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher',
    process.env.LOCALAPPDATA + '\\Ubisoft Game Launcher'
];

/**
 * Find Ubisoft Connect installation
 */
async function findUbisoftPath() {
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher" /v InstallDir',
            { encoding: 'utf8' }
        );
        const match = stdout.match(/InstallDir\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            return match[1].trim();
        }
    } catch (e) { }

    for (const ubisoftPath of UBISOFT_PATHS) {
        try {
            await fs.access(ubisoftPath);
            return ubisoftPath;
        } catch { }
    }

    return null;
}

/**
 * Get installed Ubisoft games
 */
async function getUbisoftInstalledGames() {
    const games = [];

    // Ubisoft stores install info in registry
    try {
        const { stdout } = await execAsync(
            'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs" /s',
            { encoding: 'utf8' }
        );

        const gameBlocks = stdout.split(/HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\/);

        for (const block of gameBlocks) {
            if (!block.trim()) continue;

            const gameIdMatch = block.match(/^(\d+)/);
            const pathMatch = block.match(/InstallDir\s+REG_SZ\s+(.+)/i);

            if (gameIdMatch && pathMatch) {
                const installPath = pathMatch[1].trim();
                const gameName = path.basename(installPath);

                games.push({
                    id: gameIdMatch[1],
                    name: gameName,
                    installPath: installPath,
                    isInstalled: true,
                    platform: 'ubisoft'
                });
            }
        }
    } catch (e) {
        // Registry not accessible
    }

    return games;
}

/**
 * Launch a Ubisoft game
 */
function launchUbisoftGame(gameId) {
    const launchUrl = `uplay://launch/${gameId}/0`;

    return new Promise((resolve, reject) => {
        exec(`start "" "${launchUrl}"`, (error) => {
            if (error) reject(error);
            else resolve({ success: true });
        });
    });
}

/**
 * Get Ubisoft Connect info
 */
async function getUbisoftInfo() {
    const launcherPath = await findUbisoftPath();
    const installedGames = await getUbisoftInstalledGames();

    return {
        success: true,
        installed: launcherPath !== null,
        launcherPath,
        games: installedGames,
        gameCount: installedGames.length
    };
}

// ============================================
// COMBINED FUNCTIONS
// ============================================

/**
 * Get all launcher info at once
 */
async function getAllLaunchersInfo() {
    const [epic, gog, ea, ubisoft] = await Promise.all([
        getEpicInfo(),
        getGogInfo(),
        getEaInfo(),
        getUbisoftInfo()
    ]);

    return {
        epic,
        gog,
        ea,
        ubisoft,
        totalGames: epic.gameCount + gog.gameCount + ea.gameCount + ubisoft.gameCount
    };
}

/**
 * Launch a game from any platform
 */
async function launchGame(platform, gameId) {
    switch (platform) {
        case 'epic':
            return launchEpicGame(gameId);
        case 'gog':
            return launchGogGame(gameId);
        case 'ea':
        case 'origin':
            return launchEaGame(gameId);
        case 'ubisoft':
            return launchUbisoftGame(gameId);
        default:
            throw new Error(`Unknown platform: ${platform}`);
    }
}

export const launchersService = {
    // Epic Games
    getEpicInfo,
    getEpicInstalledGames,
    launchEpicGame,
    openEpicStore,

    // GOG Galaxy
    getGogInfo,
    getGogInstalledGames,
    launchGogGame,

    // EA App
    getEaInfo,
    getEaInstalledGames,
    launchEaGame,

    // Ubisoft Connect
    getUbisoftInfo,
    getUbisoftInstalledGames,
    launchUbisoftGame,

    // Combined
    getAllLaunchersInfo,
    launchGame
};
