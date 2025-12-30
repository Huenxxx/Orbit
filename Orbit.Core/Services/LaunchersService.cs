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

    public async Task<string?> FindEpicPath()
    {
        // Try registry
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Epic Games\EpicGamesLauncher");
            if (key?.GetValue("AppDataPath") is string path)
                return path;
        }
        catch { }

        // Try common paths
        foreach (var epicPath in EPIC_LAUNCHER_PATHS)
        {
            if (Directory.Exists(epicPath))
                return epicPath;
        }

        return null;
    }

    public async Task<List<InstalledGame>> GetEpicInstalledGames()
    {
        var games = new List<InstalledGame>();
        var manifestPath = @"C:\ProgramData\Epic\EpicGamesLauncher\Data\Manifests";

        try
        {
            if (!Directory.Exists(manifestPath))
                return games;

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

                    if (!string.IsNullOrEmpty(displayName) && !string.IsNullOrEmpty(installLocation))
                    {
                        games.Add(new InstalledGame
                        {
                            Id = root.TryGetProperty("AppName", out var an) ? an.GetString() 
                                : root.TryGetProperty("CatalogItemId", out var cid) ? cid.GetString() : null,
                            Name = displayName,
                            InstallPath = installLocation,
                            Executable = root.TryGetProperty("LaunchExecutable", out var le) ? le.GetString() : null,
                            LaunchCommand = root.TryGetProperty("LaunchCommand", out var lc) ? lc.GetString() : null,
                            SizeOnDisk = root.TryGetProperty("InstallSize", out var isize) ? isize.GetInt64() : 0,
                            Platform = "epic"
                        });
                    }
                }
                catch { /* Skip invalid manifest */ }
            }
        }
        catch { }

        return games;
    }

    public async Task<object> LaunchEpicGame(string appName)
    {
        try
        {
            var launchUrl = $"com.epicgames.launcher://apps/{appName}?action=launch&silent=true";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    public async Task<object> OpenEpicStore(string appName)
    {
        try
        {
            var storeUrl = $"com.epicgames.launcher://store/product/{appName}";
            Process.Start(new ProcessStartInfo
            {
                FileName = storeUrl,
                UseShellExecute = true
            });
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
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

    public async Task<string?> FindGogPath()
    {
        // Try registry
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\GOG.com\GalaxyClient\paths");
            if (key?.GetValue("client") is string path)
                return path;
        }
        catch { }

        // Try common paths
        foreach (var gogPath in GOG_PATHS)
        {
            if (File.Exists(Path.Combine(gogPath, "GalaxyClient.exe")))
                return gogPath;
        }

        return null;
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

    public async Task<object> LaunchGogGame(string gameId)
    {
        try
        {
            var launchUrl = $"goggalaxy://runGame/{gameId}";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
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

    public async Task<(string? path, string? launcher)?> FindEaPath()
    {
        // Try EA Desktop
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Electronic Arts\EA Desktop");
            if (key?.GetValue("InstallLocation") is string path)
                return (path, "ea");
        }
        catch { }

        // Try Origin
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Origin");
            if (key?.GetValue("ClientPath") is string clientPath)
                return (Path.GetDirectoryName(clientPath), "origin");
        }
        catch { }

        // Try common paths
        foreach (var eaPath in EA_PATHS)
        {
            if (Directory.Exists(eaPath))
                return (eaPath, "ea");
        }

        return null;
    }

    public async Task<List<InstalledGame>> GetEaInstalledGames()
    {
        var games = new List<InstalledGame>();
        var contentPaths = new[] {
            @"C:\ProgramData\EA Desktop\LocalContent",
            @"C:\ProgramData\Origin\LocalContent"
        };

        foreach (var contentPath in contentPaths)
        {
            if (!Directory.Exists(contentPath)) continue;

            try
            {
                foreach (var dir in Directory.GetDirectories(contentPath))
                {
                    try
                    {
                        var installerPath = Path.Combine(dir, "__Installer");
                        if (!Directory.Exists(installerPath)) continue;

                        var manifestFiles = Directory.GetFiles(installerPath, "*.mfst");
                        if (manifestFiles.Length > 0)
                        {
                            var content = await File.ReadAllTextAsync(manifestFiles[0]);
                            var idMatch = Regex.Match(content, @"id=([^\r\n&]+)");

                            games.Add(new InstalledGame
                            {
                                Id = idMatch.Success ? idMatch.Groups[1].Value : Path.GetFileName(dir),
                                Name = Path.GetFileName(dir).Replace("_", " "),
                                InstallPath = dir,
                                Platform = "ea"
                            });
                        }
                    }
                    catch { }
                }
            }
            catch { }
        }

        // Check EA Games folders
        foreach (var folder in EA_GAME_FOLDERS)
        {
            if (!Directory.Exists(folder)) continue;

            try
            {
                foreach (var dir in Directory.GetDirectories(folder))
                {
                    var dirName = Path.GetFileName(dir);
                    if (!games.Any(g => g.Name == dirName))
                    {
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
            catch { }
        }

        return games;
    }

    public async Task<object> LaunchEaGame(string gameId)
    {
        try
        {
            var launchUrl = $"origin://launchgame/{gameId}";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
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

    public async Task<string?> FindUbisoftPath()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\WOW6432Node\Ubisoft\Launcher");
            if (key?.GetValue("InstallDir") is string path)
                return path;
        }
        catch { }

        foreach (var ubisoftPath in UBISOFT_PATHS)
        {
            if (Directory.Exists(ubisoftPath))
                return ubisoftPath;
        }

        return null;
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

    public async Task<object> LaunchUbisoftGame(string gameId)
    {
        try
        {
            var launchUrl = $"uplay://launch/{gameId}/0";
            Process.Start(new ProcessStartInfo
            {
                FileName = launchUrl,
                UseShellExecute = true
            });
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
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

    public async Task<object> LaunchGame(string platform, string gameId)
    {
        return platform.ToLower() switch
        {
            "epic" => await LaunchEpicGame(gameId),
            "gog" => await LaunchGogGame(gameId),
            "ea" or "origin" => await LaunchEaGame(gameId),
            "ubisoft" => await LaunchUbisoftGame(gameId),
            _ => new { success = false, error = $"Unknown platform: {platform}" }
        };
    }

    #endregion
}
