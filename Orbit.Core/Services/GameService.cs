using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using Orbit.Core.Models;

namespace Orbit.Core.Services
{
    public class GameService
    {
        private string _gamesPath;
        private string _configPath; // For migration
        private readonly object _fileLock = new object();

        public GameService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var orbitDir = Path.Combine(appData, "Orbit");
            _gamesPath = Path.Combine(orbitDir, "games.json");
            _configPath = Path.Combine(orbitDir, "config.json");

            if (!Directory.Exists(orbitDir))
            {
                Directory.CreateDirectory(orbitDir);
            }

            // Migration check on startup
            MigrateFromConfigIfNeeded();
        }

        private void MigrateFromConfigIfNeeded()
        {
            lock (_fileLock)
            {
                if (!File.Exists(_gamesPath) && File.Exists(_configPath))
                {
                    try
                    {
                        var json = File.ReadAllText(_configPath);
                        var root = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                        
                        if (root != null && root.ContainsKey("games"))
                        {
                            var gamesElement = (JsonElement)root["games"];
                            // Extract games logic simply by reading the raw text of that property
                            var gamesJson = gamesElement.GetRawText();
                            File.WriteAllText(_gamesPath, gamesJson);
                            
                            // Optional: Remove 'games' from config.json to clean up, 
                            // but leaving it might be safer for now unless we are sure.
                            // We will just copy it.
                            System.Diagnostics.Debug.WriteLine("[GameService] Migrated games from config.json to games.json");
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"[GameService] Migration failed: {ex.Message}");
                    }
                }
            }
        }

        public List<Game> GetGames()
        {
            lock (_fileLock)
            {
                if (File.Exists(_gamesPath))
                {
                    try
                    {
                        var json = File.ReadAllText(_gamesPath);
                        return JsonSerializer.Deserialize<List<Game>>(json) ?? new List<Game>();
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"[GameService] Error loading games: {ex.Message}");
                    }
                }
            }
            return new List<Game>();
        }

        public bool SaveGames(List<Game> games)
        {
            lock (_fileLock)
            {
                try
                {
                    var options = new JsonSerializerOptions { WriteIndented = true };
                    var json = JsonSerializer.Serialize(games, options);
                    
                    // Robust save: Write to temp, then move
                    var tempPath = _gamesPath + ".tmp";
                    File.WriteAllText(tempPath, json);
                    
                    if (File.Exists(_gamesPath))
                        File.Delete(_gamesPath);
                        
                    File.Move(tempPath, _gamesPath);
                    return true;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"[GameService] Error saving games: {ex.Message}");
                    return false;
                }
            }
        }
    }
}
