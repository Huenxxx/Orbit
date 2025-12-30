using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Win32;

namespace Orbit.Core.Services;

/// <summary>
/// Multi-Platform Game Launcher Service
/// Detects Epic Games, GOG Galaxy, EA App, and Ubisoft Connect installations
/// </summary>
public class LaunchersService
{
    #region Common Classes

    public class InstalledGame
    {
        public string? Id { get; set; }
        public string? Name { get; set; }
        public string? InstallPath { get; set; }
        public string? Executable { get; set; }
        public bool IsInstalled { get; set; } = true;
        public string? Platform { get; set; }
        public string? LaunchCommand { get; set; }
        public long SizeOnDisk { get; set; }
    }

    public class LauncherInfo
    {
        public bool Success { get; set; } = true;
        public bool Installed { get; set; }
        public string? LauncherPath { get; set; }
        public List<InstalledGame> Games { get; set; } = new();
        public int GameCount => Games.Count;
    }

    #endregion

    #region Epic Games

    private static readonly string[] EPIC_LAUNCHER_PATHS = {
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "EpicGamesLauncher"),
        @"C:\Program Files (x86)\Epic Games\Launcher",
        @"C:\Program Files\Epic Games\Launcher"
    };

    public Task<string?> FindEpicPath()
    {
        // Try registry
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher");
            if (key?.GetValue("AppDataPath") is string path)
                return Task.FromResult<string?>(path);
        }
        catch { }

        // Try common paths
        foreach (var epicPath in EPIC_LAUNCHER_PATHS)
        {
            if (Directory.Exists(epicPath))
                return Task.FromResult<string?>(epicPath);
        }

        return Task.FromResult<string?>(null);
    }

    public async Task<List<InstalledGame>> GetEpicInstalledGames()
    {
        var games = new List<InstalledGame>();
        string? manifestPath = null;

        // Strategy 1: Registry
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher");
            if (key?.GetValue("AppDataPath") is string appDataPath && !string.IsNullOrEmpty(appDataPath))
            {
               var potentialPath = Path.Combine(appDataPath, "Manifests");
               if (Directory.Exists(potentialPath))
               {
                   manifestPath = potentialPath;
               }
            }
        }
        catch { }

        // Strategy 2: Common ProgramData Path (Fallback)
        if (string.IsNullOrEmpty(manifestPath))
        {
             var commonPath = @"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests";
             if (Directory.Exists(commonPath))
             {
                 manifestPath = commonPath;
             }
        }

        if (string.IsNullOrEmpty(manifestPath))
        {
             return games;
        }

        try
        {
            var files = Directory.GetFiles(manifestPath, "*.item");

            foreach (var file in files)
            {
                try
                {
                    var content = await File.ReadAllTextAsync(file);
                    using var doc = JsonDocument.Parse(content);
                    var root = doc.RootElement;

                    var displayName = root.TryGetProperty("DisplayName", out var dn) ? dn.GetString() : null;
                    var installLocation = root.TryGetProperty("InstallLocation", out var il) ? il.GetString() : null;
                    var appName = root.TryGetProperty("AppName", out var an) ? an.GetString() : null;

                    if (!string.IsNullOrEmpty(displayName) && !string.IsNullOrEmpty(installLocation))
                    {
                        var gameId = appName;
                        if (string.IsNullOrEmpty(gameId))
                        {
                             gameId = root.TryGetProperty("CatalogItemId", out var cid) ? cid.GetString() : null;
                        }

                        games.Add(new InstalledGame
                        {
                            Id = gameId,
                            Name = displayName,
                            InstallPath = installLocation,
                            Executable = root.TryGetProperty("LaunchExecutable", out var le) ? le.GetString() : null,
                            LaunchCommand = root.TryGetProperty("LaunchCommand", out var lc) ? lc.GetString() : null,
                            SizeOnDisk = root.TryGetProperty("InstallSize", out var isize) ? isize.GetInt64() : 0,
                            Platform = "epic"
                        });
                    }
                }
                catch { }
            }
        }
        catch { }

        return games;
    }

    public Task<object> LaunchEpicGame(string appName)
    {
        try
        {
            var launchUrl = $"com.epicgames.launcher://apps/{appName}?action=launch&silent=true";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return Task.FromResult<object>(new { success = true });
        }
        catch (Exception ex)
        {
            return Task.FromResult<object>(new { success = false, error = ex.Message });
        }
    }

    public Task<object> OpenEpicStore(string appName)
    {
        try
        {
            var storeUrl = $"com.epicgames.launcher://store/product/{appName}";
            Process.Start(new ProcessStartInfo
            {
                FileName = storeUrl,
                UseShellExecute = true
            });
            return Task.FromResult<object>(new { success = true });
        }
        catch (Exception ex)
        {
            return Task.FromResult<object>(new { success = false, error = ex.Message });
        }
    }

    public async Task<object> GetEpicInfo()
    {
        var launcherPath = await FindEpicPath();
        var games = await GetEpicInstalledGames();

        return new
        {
            success = true,
            installed = launcherPath != null,
            launcherPath,
            games = games.Select(g => new
            {
                id = g.Id,
                name = g.Name,
                installPath = g.InstallPath,
                executable = g.Executable,
                isInstalled = g.IsInstalled,
                platform = g.Platform,
                sizeOnDisk = g.SizeOnDisk
            }).ToList(),
            gameCount = games.Count
        };
    }

    #endregion

    #region GOG Galaxy

    private static readonly string[] GOG_PATHS = {
        @"C:\Program Files (x86)\GOG Galaxy",
        @"C:\Program Files\GOG Galaxy",
        @"D:\GOG Galaxy",
        @"E:\GOG Galaxy"
    };

    private static readonly string[] GOG_GAME_FOLDERS = {
        @"C:\GOG Games",
        @"D:\GOG Games",
        @"C:\Program Files (x86)\GOG Galaxy\Games",
        @"C:\Program Files\GOG Galaxy\Games"
    };

    public Task<string?> FindGogPath()
    {
        // Try registry
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\GOG.com\GalaxyClient\paths");
            if (key?.GetValue("client") is string path)
                return Task.FromResult<string?>(path);
        }
        catch { }

        // Try common paths
        foreach (var gogPath in GOG_PATHS)
        {
            if (File.Exists(Path.Combine(gogPath, "GalaxyClient.exe")))
                return Task.FromResult<string?>(gogPath);
        }

        return Task.FromResult<string?>(null);
    }

    public async Task<List<InstalledGame>> GetGogInstalledGames()
    {
        var games = new List<InstalledGame>();

        // Try registry
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\GOG.com\Games");
            if (key != null)
            {
                foreach (var subKeyName in key.GetSubKeyNames())
                {
                    try
                    {
                        using var gameKey = key.OpenSubKey(subKeyName);
                        if (gameKey != null)
                        {
                            var gameName = gameKey.GetValue("GAMENAME") as string;
                            var exePath = gameKey.GetValue("EXE") as string;
                            var installPath = gameKey.GetValue("PATH") as string ?? 
                                (exePath != null ? Path.GetDirectoryName(exePath) : null);

                            if (!string.IsNullOrEmpty(gameName))
                            {
                                games.Add(new InstalledGame
                                {
                                    Id = subKeyName,
                                    Name = gameName,
                                    InstallPath = installPath,
                                    Executable = exePath,
                                    Platform = "gog"
                                });
                            }
                        }
                    }
                    catch { }
                }
            }
        }
        catch { }

        // Scan game folders as fallback
        if (games.Count == 0)
        {
            foreach (var folder in GOG_GAME_FOLDERS)
            {
                if (!Directory.Exists(folder)) continue;

                try
                {
                    foreach (var dir in Directory.GetDirectories(folder))
                    {
                        try
                        {
                            var infoFiles = Directory.GetFiles(dir, "goggame-*.info");
                            if (infoFiles.Length > 0)
                            {
                                var content = await File.ReadAllTextAsync(infoFiles[0]);
                                using var doc = JsonDocument.Parse(content);
                                var root = doc.RootElement;

                                var gameId = root.TryGetProperty("gameId", out var gid) ? gid.GetString() 
                                    : Path.GetFileNameWithoutExtension(infoFiles[0]).Replace("goggame-", "");
                                var name = root.TryGetProperty("name", out var n) ? n.GetString() : Path.GetFileName(dir);

                                games.Add(new InstalledGame
                                {
                                    Id = gameId,
                                    Name = name,
                                    InstallPath = dir,
                                    Platform = "gog"
                                });
                            }
                        }
                        catch { }
                    }
                }
                catch { }
            }
        }

        return games;
    }

    public Task<object> LaunchGogGame(string gameId)
    {
        try
        {
            var launchUrl = $"goggalaxy://runGame/{gameId}";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return Task.FromResult<object>(new { success = true });
        }
        catch (Exception ex)
        {
            return Task.FromResult<object>(new { success = false, error = ex.Message });
        }
    }

    public async Task<object> GetGogInfo()
    {
        var launcherPath = await FindGogPath();
        var games = await GetGogInstalledGames();

        return new
        {
            success = true,
            installed = launcherPath != null,
            launcherPath,
            games = games.Select(g => new
            {
                id = g.Id,
                name = g.Name,
                installPath = g.InstallPath,
                executable = g.Executable,
                isInstalled = g.IsInstalled,
                platform = g.Platform
            }).ToList(),
            gameCount = games.Count
        };
    }

    #endregion

    #region EA App / Origin

    private static readonly string[] EA_PATHS = {
        @"C:\Program Files\Electronic Arts",
        @"C:\Program Files (x86)\Origin",
        @"C:\Program Files\EA Desktop",
        @"C:\Program Files (x86)\EA Desktop",
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Electronic Arts"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Origin")
    };

    private static readonly string[] EA_GAME_FOLDERS = {
        @"C:\Program Files\EA Games",
        @"C:\Program Files (x86)\EA Games",
        @"D:\EA Games",
        @"C:\Program Files\Electronic Arts",
        @"C:\Program Files (x86)\Electronic Arts"
    };

    public Task<(string? path, string? launcher)?> FindEaPath()
    {
        // Try EA Desktop
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Electronic Arts\EA Desktop");
            if (key?.GetValue("InstallLocation") is string path)
                return Task.FromResult<(string?, string?)?>((path, "ea"));
        }
        catch { }

        // Try Origin
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Origin");
            if (key?.GetValue("ClientPath") is string clientPath)
                return Task.FromResult<(string?, string?)?>((Path.GetDirectoryName(clientPath), "origin"));
        }
        catch { }

        // Try common paths
        foreach (var eaPath in EA_PATHS)
        {
            if (Directory.Exists(eaPath))
                return Task.FromResult<(string?, string?)?>((eaPath, "ea"));
        }

        return Task.FromResult<(string?, string?)?>(null);
    }

    public async Task<List<InstalledGame>> GetEaInstalledGames()
    {
        var games = new List<InstalledGame>();
        var logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ea_debug.txt");
        
        void Log(string message) 
        {
            try { File.AppendAllText(logPath, message + Environment.NewLine); } catch {}
            System.Diagnostics.Debug.WriteLine(message);
        }

        Log($"[{DateTime.Now}] Starting EA detection...");

        var contentPaths = new[] {
            @"C:\ProgramData\EA Desktop\LocalContent",
            @"C:\ProgramData\Origin\LocalContent"
        };

        foreach (var contentPath in contentPaths)
        {
            Log($"[EA] Checking content path: {contentPath}");
            if (!Directory.Exists(contentPath)) 
            {
                Log($"[EA] Path does not exist: {contentPath}");
                continue;
            }

            try
            {
                foreach (var dir in Directory.GetDirectories(contentPath))
                {
                    Log($"[EA] Found game dir in ProgramData: {dir}");
                    try
                    {
                        var installerPath = Path.Combine(dir, "__Installer");
                        if (!Directory.Exists(installerPath))
                        {
                            Log($"[EA] __Installer folder not found in: {dir}");
                            continue;
                        }

                        var manifestFiles = Directory.GetFiles(installerPath, "*.mfst");
                        Log($"[EA] Found {manifestFiles.Length} manifest files in {installerPath}");

                        if (manifestFiles.Length > 0)
                        {
                            var content = await File.ReadAllTextAsync(manifestFiles[0]);
                            var idMatch = Regex.Match(content, @"id=([^\r\n&]+)");
                            var titleMatch = Regex.Match(content, @"title=([^\r\n&]+)"); // Try to find title in manifest
                            
                            var gameId = idMatch.Success ? idMatch.Groups[1].Value : Path.GetFileName(dir);
                            var gameName = titleMatch.Success ? titleMatch.Groups[1].Value : Path.GetFileName(dir).Replace("_", " ");

                            Log($"[EA] Parsed game - ID: {gameId}, Name: {gameName}");

                            games.Add(new InstalledGame
                            {
                                Id = gameId,
                                Name = gameName,
                                InstallPath = dir,
                                Platform = "ea"
                            });
                        }
                    }
                    catch (Exception ex)
                    {
                         Log($"[EA] Error processing dir {dir}: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Log($"[EA] Error scanning content path {contentPath}: {ex.Message}");
            }
        }

        // Check EA Games folders (Installation directories)
        foreach (var folder in EA_GAME_FOLDERS)
        {
            Log($"[EA] Checking installation folder: {folder}");
            if (!Directory.Exists(folder)) continue;

            try
            {
                foreach (var dir in Directory.GetDirectories(folder))
                {
                    var dirName = Path.GetFileName(dir);
                    Log($"[EA] Found potential game folder: {dirName} in {folder}");

                    // Skip the launcher itself and other non-game folders
                    if (dirName.Equals("EA Desktop", StringComparison.OrdinalIgnoreCase) || 
                        dirName.Equals("Electronic Arts", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("Origin", StringComparison.OrdinalIgnoreCase) ||
                        dirName.Equals("EA Core", StringComparison.OrdinalIgnoreCase) ||
                        dirName.StartsWith("DirectX", StringComparison.OrdinalIgnoreCase) ||
                        dirName.StartsWith("__Installer", StringComparison.OrdinalIgnoreCase))
                    {
                         Log($"[EA] Skipping non-game directory: {dirName}");
                         continue;
                    }

                    if (!games.Any(g => g.Name == dirName))
                    {
                        // Double check if it looks like a game (has an exe or __Installer)
                        bool isLikelyGame = Directory.Exists(Path.Combine(dir, "__Installer")) || 
                                           Directory.GetFiles(dir, "*.exe", SearchOption.TopDirectoryOnly).Any();

                        if (isLikelyGame)
                        {
                            Log($"[EA] Adding game from folder: {dirName}");
                            games.Add(new InstalledGame
                            {
                                Id = dirName.ToLower().Replace(" ", "-"),
                                Name = dirName,
                                InstallPath = dir,
                                Platform = "ea"
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Log($"[EA] Error scanning folder {folder}: {ex.Message}");
            }
        }

        // Strategy 3: Registry Scan for EA Games
        try
        {
            string[] registryPaths = {
                @"SOFTWARE\Electronic Arts",
                @"SOFTWARE\WOW6432Node\Electronic Arts"
            };

            foreach (var regPath in registryPaths)
            {
                using var eaKey = Registry.LocalMachine.OpenSubKey(regPath);
                if (eaKey == null) continue;

                foreach (var subKeyName in eaKey.GetSubKeyNames())
                {
                    // Skip EA Desktop itself and common non-game keys
                    if (subKeyName.Equals("EA Desktop", StringComparison.OrdinalIgnoreCase) ||
                        subKeyName.Equals("EA Core", StringComparison.OrdinalIgnoreCase))
                        continue;

                    using var gameKey = eaKey.OpenSubKey(subKeyName);
                    if (gameKey == null) continue;

                    var installDir = gameKey.GetValue("Install Location") as string ?? 
                                    gameKey.GetValue("Install Dir") as string;

                    if (!string.IsNullOrEmpty(installDir) && Directory.Exists(installDir))
                    {
                        var displayName = gameKey.GetValue("DisplayName") as string ?? subKeyName;
                        
                        if (!games.Any(g => g.InstallPath?.Equals(installDir, StringComparison.OrdinalIgnoreCase) == true))
                        {
                            Log($"[EA] Found game via Registry: {displayName} at {installDir}");
                            games.Add(new InstalledGame
                            {
                                Id = subKeyName.ToLower().Replace(" ", "-"),
                                Name = displayName,
                                InstallPath = installDir,
                                Platform = "ea"
                            });
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Log($"[EA] Error scanning registry: {ex.Message}");
        }

        Log($"[EA] Total games found: {games.Count}");
        return games;
    }

    public Task<object> LaunchEaGame(string gameId)
    {
        try
        {
            var launchUrl = $"origin://launchgame/{gameId}";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return Task.FromResult<object>(new { success = true });
        }
        catch (Exception ex)
        {
            return Task.FromResult<object>(new { success = false, error = ex.Message });
        }
    }

    public async Task<object> GetEaInfo()
    {
        var launcherInfo = await FindEaPath();
        var games = await GetEaInstalledGames();

        return new
        {
            success = true,
            installed = launcherInfo != null,
            launcherPath = launcherInfo?.path,
            launcherType = launcherInfo?.launcher,
            games = games.Select(g => new
            {
                id = g.Id,
                name = g.Name,
                installPath = g.InstallPath,
                isInstalled = g.IsInstalled,
                platform = g.Platform
            }).ToList(),
            gameCount = games.Count
        };
    }

    #endregion

    #region Ubisoft Connect

    private static readonly string[] UBISOFT_PATHS = {
        @"C:\Program Files (x86)\Ubisoft\Ubisoft Game Launcher",
        @"C:\Program Files\Ubisoft\Ubisoft Game Launcher",
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Ubisoft Game Launcher")
    };

    public Task<string?> FindUbisoftPath()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Ubisoft\Launcher");
            if (key?.GetValue("InstallDir") is string path)
                return Task.FromResult<string?>(path);
        }
        catch { }

        foreach (var ubisoftPath in UBISOFT_PATHS)
        {
            if (Directory.Exists(ubisoftPath))
                return Task.FromResult<string?>(ubisoftPath);
        }

        return Task.FromResult<string?>(null);
    }

    public async Task<List<InstalledGame>> GetUbisoftInstalledGames()
    {
        var games = new List<InstalledGame>();

        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs");
            if (key != null)
            {
                foreach (var subKeyName in key.GetSubKeyNames())
                {
                    try
                    {
                        using var gameKey = key.OpenSubKey(subKeyName);
                        if (gameKey?.GetValue("InstallDir") is string installPath)
                        {
                            games.Add(new InstalledGame
                            {
                                Id = subKeyName,
                                Name = Path.GetFileName(installPath),
                                InstallPath = installPath,
                                Platform = "ubisoft"
                            });
                        }
                    }
                    catch { }
                }
            }
        }
        catch { }

        return games;
    }

    public Task<object> LaunchUbisoftGame(string gameId)
    {
        try
        {
            var launchUrl = $"uplay://launch/{gameId}/0";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return Task.FromResult<object>(new { success = true });
        }
        catch (Exception ex)
        {
            return Task.FromResult<object>(new { success = false, error = ex.Message });
        }
    }

    public async Task<object> GetUbisoftInfo()
    {
        var launcherPath = await FindUbisoftPath();
        var games = await GetUbisoftInstalledGames();

        return new
        {
            success = true,
            installed = launcherPath != null,
            launcherPath,
            games = games.Select(g => new
            {
                id = g.Id,
                name = g.Name,
                installPath = g.InstallPath,
                isInstalled = g.IsInstalled,
                platform = g.Platform
            }).ToList(),
            gameCount = games.Count
        };
    }

    #endregion

    #region Combined Functions

    public async Task<object> GetAllLaunchersInfo()
    {
        var epicTask = GetEpicInfo();
        var gogTask = GetGogInfo();
        var eaTask = GetEaInfo();
        var ubisoftTask = GetUbisoftInfo();

        await Task.WhenAll(epicTask, gogTask, eaTask, ubisoftTask);

        var epic = await epicTask;
        var gog = await gogTask;
        var ea = await eaTask;
        var ubisoft = await ubisoftTask;

        // Extract game counts using reflection or dynamic
        var epicJson = JsonSerializer.Serialize(epic);
        var gogJson = JsonSerializer.Serialize(gog);
        var eaJson = JsonSerializer.Serialize(ea);
        var ubisoftJson = JsonSerializer.Serialize(ubisoft);

        using var epicDoc = JsonDocument.Parse(epicJson);
        using var gogDoc = JsonDocument.Parse(gogJson);
        using var eaDoc = JsonDocument.Parse(eaJson);
        using var ubisoftDoc = JsonDocument.Parse(ubisoftJson);

        var totalGames = 
            (epicDoc.RootElement.TryGetProperty("gameCount", out var ec) ? ec.GetInt32() : 0) +
            (gogDoc.RootElement.TryGetProperty("gameCount", out var gc) ? gc.GetInt32() : 0) +
            (eaDoc.RootElement.TryGetProperty("gameCount", out var eac) ? eac.GetInt32() : 0) +
            (ubisoftDoc.RootElement.TryGetProperty("gameCount", out var uc) ? uc.GetInt32() : 0);

        return new
        {
            epic,
            gog,
            ea,
            ubisoft,
            totalGames
        };
    }

    public Task<object> LaunchGame(string platform, string gameId)
    {
        return platform.ToLower() switch
        {
            "epic" => LaunchEpicGame(gameId),
            "gog" => LaunchGogGame(gameId),
            "ea" or "origin" => LaunchEaGame(gameId),
            "ubisoft" => LaunchUbisoftGame(gameId),
            _ => Task.FromResult<object>(new { success = false, error = $"Unknown platform: {platform}" })
        };
    }

    #endregion
}
