using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Management;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Security;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Orbit.Core.Services;

/// <summary>
/// Service for detecting League of Legends and communicating with the LCU API.
/// This is completely legal and uses Riot's official local client API.
/// Similar to how Blitz.gg, OP.GG, Mobalytics, etc. work.
/// </summary>
public class LeagueDetectionService : IDisposable
{
    public event EventHandler<LeagueClientInfo>? ClientConnected;
    public event EventHandler? ClientDisconnected;
    public event EventHandler<GameState>? GameStateChanged;
    public event EventHandler<LiveGameData>? LiveDataUpdated;

    private System.Timers.Timer? _detectionTimer;
    private System.Timers.Timer? _gameDataTimer;
    private LeagueClientInfo? _currentClient;
    private HttpClient? _lcuHttpClient;
    private HttpClient? _liveGameHttpClient;
    private bool _isInGame;
    private bool _disposed;

    public bool IsClientRunning => _currentClient != null;
    public bool IsInGame => _isInGame;
    public LeagueClientInfo? CurrentClient => _currentClient;

    public LeagueDetectionService()
    {
        // Client for LCU API (League Client)
        _liveGameHttpClient = new HttpClient(new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (msg, cert, chain, errors) => true
        });
        _liveGameHttpClient.Timeout = TimeSpan.FromSeconds(2);
    }

    /// <summary>
    /// Starts monitoring for League of Legends client
    /// </summary>
    public void StartMonitoring(int intervalMs = 3000)
    {
        _detectionTimer = new System.Timers.Timer(intervalMs);
        _detectionTimer.Elapsed += async (s, e) => await CheckForLeagueClient();
        _detectionTimer.Start();

        // Also check immediately
        _ = CheckForLeagueClient();
    }

    /// <summary>
    /// Stops all monitoring
    /// </summary>
    public void StopMonitoring()
    {
        _detectionTimer?.Stop();
        _detectionTimer?.Dispose();
        _gameDataTimer?.Stop();
        _gameDataTimer?.Dispose();
        _lcuHttpClient?.Dispose();
    }

    private async Task CheckForLeagueClient()
    {
        try
        {
            var clientInfo = GetLeagueClientInfo();
            
            if (clientInfo != null && _currentClient == null)
            {
                // Client just connected
                _currentClient = clientInfo;
                SetupLcuHttpClient(clientInfo);
                ClientConnected?.Invoke(this, clientInfo);
                Debug.WriteLine($"[Astra] League Client connected on port {clientInfo.Port}");
            }
            else if (clientInfo == null && _currentClient != null)
            {
                // Client disconnected
                _currentClient = null;
                _isInGame = false;
                _lcuHttpClient?.Dispose();
                _lcuHttpClient = null;
                ClientDisconnected?.Invoke(this, EventArgs.Empty);
                Debug.WriteLine("[Astra] League Client disconnected");
            }

            // Check if in-game
            if (_currentClient != null)
            {
                await CheckGameState();
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[Astra] Detection error: {ex.Message}");
        }
    }

    /// <summary>
    /// Gets League Client info by reading the lockfile or process command line.
    /// This is the official way to get LCU credentials - completely legal.
    /// </summary>
    private LeagueClientInfo? GetLeagueClientInfo()
    {
        try
        {
            // Method 1: Find LeagueClientUx process and parse command line
            var processes = Process.GetProcessesByName("LeagueClientUx");
            
            if (processes.Length == 0)
            {
                processes = Process.GetProcessesByName("LeagueClient");
            }

            if (processes.Length == 0) return null;

            foreach (var process in processes)
            {
                try
                {
                    var cmdLine = GetProcessCommandLine(process.Id);
                    if (string.IsNullOrEmpty(cmdLine)) continue;

                    // Parse command line arguments
                    var portMatch = Regex.Match(cmdLine, @"--app-port=(\d+)");
                    var tokenMatch = Regex.Match(cmdLine, @"--remoting-auth-token=([\w-]+)");
                    var pidMatch = Regex.Match(cmdLine, @"--app-pid=(\d+)");

                    if (portMatch.Success && tokenMatch.Success)
                    {
                        return new LeagueClientInfo
                        {
                            ProcessId = process.Id,
                            Port = int.Parse(portMatch.Groups[1].Value),
                            AuthToken = tokenMatch.Groups[1].Value,
                            Protocol = "https"
                        };
                    }
                }
                catch { /* Skip this process */ }
            }

            // Method 2: Try reading lockfile from common install locations
            var lockfilePaths = new[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
                    "Riot Games", "League of Legends", "lockfile"),
                @"C:\Riot Games\League of Legends\lockfile",
                @"D:\Riot Games\League of Legends\lockfile",
            };

            foreach (var lockfilePath in lockfilePaths)
            {
                if (File.Exists(lockfilePath))
                {
                    var lockfileInfo = ParseLockfile(lockfilePath);
                    if (lockfileInfo != null) return lockfileInfo;
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[Astra] Error getting client info: {ex.Message}");
        }

        return null;
    }

    private string? GetProcessCommandLine(int processId)
    {
        try
        {
            using var searcher = new ManagementObjectSearcher(
                $"SELECT CommandLine FROM Win32_Process WHERE ProcessId = {processId}");
            
            foreach (var obj in searcher.Get())
            {
                return obj["CommandLine"]?.ToString();
            }
        }
        catch { }
        
        return null;
    }

    private LeagueClientInfo? ParseLockfile(string path)
    {
        try
        {
            // Lockfile format: processName:pid:port:authToken:protocol
            using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            using var reader = new StreamReader(fs);
            var content = reader.ReadToEnd();
            var parts = content.Split(':');

            if (parts.Length >= 5)
            {
                return new LeagueClientInfo
                {
                    ProcessId = int.Parse(parts[1]),
                    Port = int.Parse(parts[2]),
                    AuthToken = parts[3],
                    Protocol = parts[4]
                };
            }
        }
        catch { }

        return null;
    }

    private void SetupLcuHttpClient(LeagueClientInfo info)
    {
        _lcuHttpClient?.Dispose();
        
        var handler = new HttpClientHandler
        {
            // LCU uses a self-signed certificate, we must trust it
            ServerCertificateCustomValidationCallback = (msg, cert, chain, errors) => true
        };

        _lcuHttpClient = new HttpClient(handler);
        _lcuHttpClient.BaseAddress = new Uri($"{info.Protocol}://127.0.0.1:{info.Port}/");
        
        // Authentication is Basic with username "riot" and the auth token as password
        var authBytes = Encoding.ASCII.GetBytes($"riot:{info.AuthToken}");
        _lcuHttpClient.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Basic", Convert.ToBase64String(authBytes));
        _lcuHttpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    private async Task CheckGameState()
    {
        try
        {
            // Check Live Game API (only available during active game)
            var response = await _liveGameHttpClient!.GetAsync("https://127.0.0.1:2999/liveclientdata/allgamedata");
            
            if (response.IsSuccessStatusCode)
            {
                if (!_isInGame)
                {
                    _isInGame = true;
                    GameStateChanged?.Invoke(this, new GameState { IsInGame = true, Phase = "InGame" });
                    StartLiveGameMonitoring();
                }
            }
            else if (_isInGame)
            {
                _isInGame = false;
                GameStateChanged?.Invoke(this, new GameState { IsInGame = false, Phase = "OutOfGame" });
                StopLiveGameMonitoring();
            }
        }
        catch
        {
            // Not in game (API not available)
            if (_isInGame)
            {
                _isInGame = false;
                GameStateChanged?.Invoke(this, new GameState { IsInGame = false, Phase = "OutOfGame" });
                StopLiveGameMonitoring();
            }
        }
    }

    private void StartLiveGameMonitoring()
    {
        _gameDataTimer?.Stop();
        _gameDataTimer = new System.Timers.Timer(1000); // Update every second during game
        _gameDataTimer.Elapsed += async (s, e) => await FetchLiveGameData();
        _gameDataTimer.Start();
    }

    private void StopLiveGameMonitoring()
    {
        _gameDataTimer?.Stop();
        _gameDataTimer?.Dispose();
        _gameDataTimer = null;
    }

    private async Task FetchLiveGameData()
    {
        try
        {
            var response = await _liveGameHttpClient!.GetAsync("https://127.0.0.1:2999/liveclientdata/allgamedata");
            
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var gameData = ParseLiveGameData(json);
                if (gameData != null)
                {
                    LiveDataUpdated?.Invoke(this, gameData);
                }
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[Astra] Error fetching live data: {ex.Message}");
        }
    }

    private LiveGameData? ParseLiveGameData(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var activePlayer = root.GetProperty("activePlayer");
            var allPlayers = root.GetProperty("allPlayers");
            var gameData = root.GetProperty("gameData");
            var events = root.GetProperty("events");

            // Find active player in allPlayers to get KDA
            var summonerName = activePlayer.GetProperty("summonerName").GetString();
            var currentPlayer = allPlayers.EnumerateArray()
                .FirstOrDefault(p => p.GetProperty("summonerName").GetString() == summonerName);

            var scores = currentPlayer.GetProperty("scores");
            var cs = scores.GetProperty("creepScore").GetInt32();
            var kills = scores.GetProperty("kills").GetInt32();
            var deaths = scores.GetProperty("deaths").GetInt32();
            var assists = scores.GetProperty("assists").GetInt32();
            var wardScore = scores.GetProperty("wardScore").GetDouble();

            var gameTime = gameData.GetProperty("gameTime").GetDouble();
            var csPerMin = gameTime > 0 ? (cs / (gameTime / 60.0)) : 0;

            // Get champion abilities cooldowns
            var abilities = activePlayer.GetProperty("abilities");

            return new LiveGameData
            {
                GameTime = gameTime,
                SummonerName = summonerName ?? "Unknown",
                ChampionName = currentPlayer.GetProperty("championName").GetString() ?? "Unknown",
                Kills = kills,
                Deaths = deaths,
                Assists = assists,
                CreepScore = cs,
                CsPerMin = Math.Round(csPerMin, 1),
                VisionScore = (int)wardScore,
                Level = activePlayer.GetProperty("level").GetInt32(),
                CurrentGold = activePlayer.GetProperty("currentGold").GetDouble(),
                Abilities = ParseAbilities(abilities)
            };
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[Astra] Error parsing game data: {ex.Message}");
            return null;
        }
    }

    private AbilityInfo[] ParseAbilities(JsonElement abilities)
    {
        var result = new AbilityInfo[4];
        var keys = new[] { "Q", "W", "E", "R" };

        for (int i = 0; i < keys.Length; i++)
        {
            try
            {
                var ability = abilities.GetProperty(keys[i]);
                result[i] = new AbilityInfo
                {
                    Key = keys[i],
                    Name = ability.GetProperty("displayName").GetString() ?? keys[i],
                    Level = ability.GetProperty("abilityLevel").GetInt32()
                };
            }
            catch
            {
                result[i] = new AbilityInfo { Key = keys[i], Name = keys[i], Level = 0 };
            }
        }

        return result;
    }

    /// <summary>
    /// Make a request to the LCU API
    /// </summary>
    public async Task<string?> LcuRequest(string endpoint, HttpMethod? method = null, object? body = null)
    {
        if (_lcuHttpClient == null) return null;

        try
        {
            var request = new HttpRequestMessage(method ?? HttpMethod.Get, endpoint);
            
            if (body != null)
            {
                var json = JsonSerializer.Serialize(body);
                request.Content = new StringContent(json, Encoding.UTF8, "application/json");
            }

            var response = await _lcuHttpClient.SendAsync(request);
            
            if (response.IsSuccessStatusCode)
            {
                return await response.Content.ReadAsStringAsync();
            }
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[Astra] LCU request error: {ex.Message}");
        }

        return null;
    }

    /// <summary>
    /// Set the active rune page
    /// </summary>
    public async Task<bool> SetRunePage(string name, int primaryStyleId, int subStyleId, List<int> selectedPerkIds)
    {
        try
        {
            // 1. Get current pages to find if we need to delete one (max is usually 2 or more, but we want to cleanup)
            var pagesJson = await LcuRequest("/lol-perks/v1/pages");
            if (pagesJson != null)
            {
                using var doc = JsonDocument.Parse(pagesJson);
                foreach (var page in doc.RootElement.EnumerateArray())
                {
                    var pageName = page.GetProperty("name").GetString();
                    var pageId = page.GetProperty("id").GetInt64();
                    
                    // If we find our page, or if we want to recycle the current page
                    if (pageName == name || pageName == "Orbit Astra")
                    {
                        await LcuRequest($"/lol-perks/v1/pages/{pageId}", HttpMethod.Delete);
                    }
                }
            }

            // 2. Create new page
            var body = new
            {
                name = name,
                primaryStyleId = primaryStyleId,
                subStyleId = subStyleId,
                selectedPerkIds = selectedPerkIds,
                current = true
            };

            var response = await LcuRequest("/lol-perks/v1/pages", HttpMethod.Post, body);
            return response != null;
        }
        catch 
        { 
            return false; 
        }
    }

    /// <summary>
    /// Set summoner spells for current game
    /// </summary>
    public async Task<bool> SetSummonerSpells(int spell1Id, int spell2Id)
    {
        try
        {
            var body = new { spell1Id, spell2Id };
            var response = await LcuRequest("/lol-champ-select/v1/session/my-selection", new HttpMethod("PATCH"), body);
            return response != null;
        }
        catch { return false; }
    }

    /// <summary>
    /// Create/Update item set for a specific champion
    /// </summary>
    public async Task<bool> SetItemSet(int championId, object itemSetData)
    {
        try
        {
            // We need the summoner ID to set item sets
            var summoner = await GetCurrentSummoner();
            if (summoner == null) return false;

            // Ideally we get existing sets, append/update, and save.
            // For now, we'll try to push this specific set into the user's config
            // Note: The LCU Item Set API is complex (requires rewriting all sets). 
            // A safer approach for a tool like this is simply creating a set and updating the whole list.
            
            var existingSetsJson = await LcuRequest($"/lol-item-sets/v1/item-sets/{summoner.SummonerId}/sets");
            
            // Simplified: Just use the provided data as a single set update if possible, 
            // but since we want to avoid wiping user data, we simulate a success for now 
            // OR fully implement the fetch-merge-save logic.
            
            // Let's implement robust Fetch-Merge-Save
            ItemSetsRoot? currentSets = null;
            if (existingSetsJson != null)
            {
                currentSets = JsonSerializer.Deserialize<ItemSetsRoot>(existingSetsJson);
            }
            
            if (currentSets == null) currentSets = new ItemSetsRoot { ItemSets = new List<ItemSet>() };

            // We need to deserialize the incoming itemSetData to an ItemSet object
            var json = JsonSerializer.Serialize(itemSetData);
            var newSet = JsonSerializer.Deserialize<ItemSet>(json);
            
            if (newSet != null)
            {
                // Remove existing sets for this champ created by Orbit
                currentSets.ItemSets.RemoveAll(s => s.Title != null && s.Title.StartsWith("Orbit") && s.AssociatedChampions.Contains(championId));
                
                if (string.IsNullOrEmpty(newSet.Title)) newSet.Title = "Orbit ASTRA Build";
                newSet.AssociatedChampions = new List<int> { championId };
                newSet.Map = "any";
                newSet.Mode = "any";
                currentSets.ItemSets.Add(newSet);
            }

            var saveResponse = await LcuRequest(
                $"/lol-item-sets/v1/item-sets/{summoner.SummonerId}/sets", 
                HttpMethod.Put, 
                currentSets
            );

            return saveResponse != null;
        }
        catch { return false; }
    }

    /// <summary>
    /// Get current summoner info from LCU
    /// </summary>
    public async Task<SummonerInfo?> GetCurrentSummoner()
    {
        var json = await LcuRequest("/lol-summoner/v1/current-summoner");
        if (json == null) return null;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            return new SummonerInfo
            {
                DisplayName = root.GetProperty("displayName").GetString() ?? "Unknown",
                SummonerId = root.GetProperty("summonerId").GetInt64(),
                AccountId = root.GetProperty("accountId").GetInt64(),
                ProfileIconId = root.GetProperty("profileIconId").GetInt32(),
                SummonerLevel = root.GetProperty("summonerLevel").GetInt32()
            };
        }
        catch { return null; }
    }

    /// <summary>
    /// Get ranked stats for the current summoner
    /// </summary>
    public async Task<RankedStats?> GetRankedStats()
    {
        var json = await LcuRequest("/lol-ranked/v1/current-ranked-stats");
        if (json == null) return null;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var stats = new RankedStats();

            // Get Solo/Duo queue stats
            if (root.TryGetProperty("queueMap", out var queueMap))
            {
                if (queueMap.TryGetProperty("RANKED_SOLO_5x5", out var soloQ))
                {
                    stats.SoloTier = soloQ.GetProperty("tier").GetString() ?? "UNRANKED";
                    stats.SoloDivision = soloQ.GetProperty("division").GetString() ?? "";
                    stats.SoloLP = soloQ.GetProperty("leaguePoints").GetInt32();
                    stats.SoloWins = soloQ.GetProperty("wins").GetInt32();
                    stats.SoloLosses = soloQ.GetProperty("losses").GetInt32();
                }

                if (queueMap.TryGetProperty("RANKED_FLEX_SR", out var flexQ))
                {
                    stats.FlexTier = flexQ.GetProperty("tier").GetString() ?? "UNRANKED";
                    stats.FlexDivision = flexQ.GetProperty("division").GetString() ?? "";
                }
            }

            return stats;
        }
        catch { return null; }
    }

    /// <summary>
    /// Get current champ select session (when in lobby picking champions)
    /// </summary>
    public async Task<ChampSelectSession?> GetChampSelectSession()
    {
        var json = await LcuRequest("/lol-champ-select/v1/session");
        if (json == null) return null;

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var session = new ChampSelectSession
            {
                GameId = root.GetProperty("gameId").GetInt64(),
                IsCustomGame = root.TryGetProperty("isCustomGame", out var custom) && custom.GetBoolean()
            };

            // Get local player cell ID
            if (root.TryGetProperty("localPlayerCellId", out var cellId))
            {
                session.LocalPlayerCellId = cellId.GetInt32();
            }

            // Get assigned position
            if (root.TryGetProperty("myTeam", out var myTeam))
            {
                foreach (var player in myTeam.EnumerateArray())
                {
                    if (player.GetProperty("cellId").GetInt32() == session.LocalPlayerCellId)
                    {
                        session.AssignedPosition = player.GetProperty("assignedPosition").GetString() ?? "";
                        session.ChampionId = player.GetProperty("championId").GetInt32();
                        session.ChampionPickIntent = player.GetProperty("championPickIntent").GetInt32();
                        break;
                    }
                }
            }

            // Get timer info
            if (root.TryGetProperty("timer", out var timer))
            {
                session.Phase = timer.GetProperty("phase").GetString() ?? "";
                session.TimeRemaining = timer.GetProperty("adjustedTimeLeftInPhase").GetInt64();
            }

            // Get bans
            if (root.TryGetProperty("bans", out var bans))
            {
                if (bans.TryGetProperty("myTeamBans", out var myBans))
                {
                    session.MyTeamBans = myBans.EnumerateArray().Select(b => b.GetInt32()).ToList();
                }
                if (bans.TryGetProperty("theirTeamBans", out var theirBans))
                {
                    session.EnemyTeamBans = theirBans.EnumerateArray().Select(b => b.GetInt32()).ToList();
                }
            }

            return session;
        }
        catch { return null; }
    }

    /// <summary>
    /// Check if we are currently in champion select
    /// </summary>
    public async Task<bool> IsInChampSelect()
    {
        var session = await GetChampSelectSession();
        return session != null;
    }

    /// <summary>
    /// Select a champion during champ select
    /// </summary>
    public async Task<bool> SelectChampion(int championId, int actionId)
    {
        if (_lcuHttpClient == null) return false;

        try
        {
            var content = new StringContent(
                JsonSerializer.Serialize(new { championId }),
                Encoding.UTF8, 
                "application/json"
            );

            var response = await _lcuHttpClient.PatchAsync(
                $"/lol-champ-select/v1/session/actions/{actionId}",
                content
            );

            return response.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    /// <summary>
    /// Lock in the currently selected champion
    /// </summary>
    public async Task<bool> LockInChampion(int actionId)
    {
        if (_lcuHttpClient == null) return false;

        try
        {
            var response = await _lcuHttpClient.PostAsync(
                $"/lol-champ-select/v1/session/actions/{actionId}/complete",
                null
            );

            return response.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    /// <summary>
    /// Get list of owned champions
    /// </summary>
    public async Task<List<OwnedChampion>> GetOwnedChampions()
    {
        var json = await LcuRequest("/lol-champions/v1/owned-champions-minimal");
        if (json == null) return new List<OwnedChampion>();

        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.EnumerateArray()
                .Select(c => new OwnedChampion
                {
                    Id = c.GetProperty("id").GetInt32(),
                    Name = c.GetProperty("name").GetString() ?? "",
                    Alias = c.TryGetProperty("alias", out var alias) ? alias.GetString() ?? "" : ""
                })
                .ToList();
        }
        catch { return new List<OwnedChampion>(); }
    }

    /// <summary>
    /// Get champion roles (tags) e.g., Fighter, Mage
    /// </summary>
    public async Task<List<string>> GetChampionRoles(int championId)
    {
        var summoner = await GetCurrentSummoner();
        if (summoner == null) return new List<string>();

        var json = await LcuRequest($"/lol-champions/v1/inventories/{summoner.SummonerId}/champions/{championId}");
        if (json == null) return new List<string>();

        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("roles", out var roles))
            {
                return roles.EnumerateArray().Select(r => r.GetString() ?? "").ToList();
            }
            return new List<string>();
        }
        catch { return new List<string>(); }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        
        StopMonitoring();
        _lcuHttpClient?.Dispose();
        _liveGameHttpClient?.Dispose();
    }
}

// ========================================
// DATA CLASSES
// ========================================

public class LeagueClientInfo
{
    public int ProcessId { get; set; }
    public int Port { get; set; }
    public string AuthToken { get; set; } = "";
    public string Protocol { get; set; } = "https";
}

public class GameState
{
    public bool IsInGame { get; set; }
    public string Phase { get; set; } = "";
}

public class LiveGameData
{
    public double GameTime { get; set; }
    public string SummonerName { get; set; } = "";
    public string ChampionName { get; set; } = "";
    public int Kills { get; set; }
    public int Deaths { get; set; }
    public int Assists { get; set; }
    public int CreepScore { get; set; }
    public double CsPerMin { get; set; }
    public int VisionScore { get; set; }
    public int Level { get; set; }
    public double CurrentGold { get; set; }
    public AbilityInfo[] Abilities { get; set; } = Array.Empty<AbilityInfo>();
}

public class AbilityInfo
{
    public string Key { get; set; } = "";
    public string Name { get; set; } = "";
    public int Level { get; set; }
}

public class SummonerInfo
{
    public string DisplayName { get; set; } = "";
    public long SummonerId { get; set; }
    public long AccountId { get; set; }
    public int ProfileIconId { get; set; }
    public int SummonerLevel { get; set; }
}

public class RankedStats
{
    public string SoloTier { get; set; } = "UNRANKED";
    public string SoloDivision { get; set; } = "";
    public int SoloLP { get; set; }
    public int SoloWins { get; set; }
    public int SoloLosses { get; set; }
    public double SoloWinRate => SoloWins + SoloLosses > 0 
        ? Math.Round((double)SoloWins / (SoloWins + SoloLosses) * 100, 1) 
        : 0;

    public string FlexTier { get; set; } = "UNRANKED";
    public string FlexDivision { get; set; } = "";
}

public class ItemSetsRoot
{
    [JsonPropertyName("itemSets")]
    public List<ItemSet> ItemSets { get; set; } = new List<ItemSet>();
}

public class ItemSet
{
    [JsonPropertyName("title")]
    public string Title { get; set; } = "";
    
    [JsonPropertyName("blocks")]
    public List<ItemBlock> Blocks { get; set; } = new List<ItemBlock>();
    
    [JsonPropertyName("associatedChampions")]
    public List<int> AssociatedChampions { get; set; } = new List<int>();
    
    [JsonPropertyName("map")]
    public string Map { get; set; } = "any";
    
    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "any";
}

public class ItemBlock 
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";
    
    [JsonPropertyName("items")]
    public List<ItemEntry> Items { get; set; } = new List<ItemEntry>();
}

public class ItemEntry
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";
    
    [JsonPropertyName("count")]
    public int Count { get; set; } = 1;
}

public class ChampSelectSession
{
    public long GameId { get; set; }
    public bool IsCustomGame { get; set; }
    public int LocalPlayerCellId { get; set; }
    public string AssignedPosition { get; set; } = ""; // top, jungle, middle, bottom, utility
    public int ChampionId { get; set; }
    public int ChampionPickIntent { get; set; }
    public string Phase { get; set; } = "";
    public long TimeRemaining { get; set; }
    public List<int> MyTeamBans { get; set; } = new();
    public List<int> EnemyTeamBans { get; set; } = new();
}

public class OwnedChampion
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Alias { get; set; } = "";
}

public class ChampionRecommendation
{
    public int ChampionId { get; set; }
    public string ChampionName { get; set; } = "";
    public string Role { get; set; } = "";
    public double WinRate { get; set; }
    public double PickRate { get; set; }
    public int GamesPlayed { get; set; }
    public string Tier { get; set; } = ""; // S, A, B, C, D
}

public class RuneRecommendation
{
    public int PrimaryStyleId { get; set; }
    public string PrimaryStyleName { get; set; } = "";
    public int KeystoneId { get; set; }
    public string KeystoneName { get; set; } = "";
    public List<int> PrimaryRunes { get; set; } = new();
    public List<string> PrimaryRuneNames { get; set; } = new();
    
    public int SecondaryStyleId { get; set; }
    public string SecondaryStyleName { get; set; } = "";
    public List<int> SecondaryRunes { get; set; } = new();
    public List<string> SecondaryRuneNames { get; set; } = new();
    
    public List<int> StatShards { get; set; } = new();
    public double WinRate { get; set; }
    public int GamesPlayed { get; set; }
}

public class ItemBuild
{
    public string BuildName { get; set; } = "";
    public double WinRate { get; set; }
    public int GamesPlayed { get; set; }
    public List<BuildItem> StartingItems { get; set; } = new();
    public List<BuildItem> CoreItems { get; set; } = new();
    public List<BuildItem> SituationalItems { get; set; } = new();
    public List<BuildItem> Boots { get; set; } = new();
}

public class BuildItem
{
    public int ItemId { get; set; }
    public string Name { get; set; } = "";
    public string IconUrl { get; set; } = "";
}

