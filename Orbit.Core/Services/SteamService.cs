using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Orbit.Core.Services;

/// <summary>
/// Steam API Service for Orbit
/// Handles all Steam Web API calls
/// </summary>
public class SteamService
{
    private const string STEAM_API_KEY = "41653837E79D81640C4299F9984FB885";
    private const string STEAM_API_BASE = "https://api.steampowered.com";
    private static readonly HttpClient _httpClient = new();

    #region Response Classes

    public class SteamGame
    {
        [JsonPropertyName("appid")]
        public int AppId { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("playtime_forever")]
        public int PlaytimeForever { get; set; }

        [JsonPropertyName("playtime_2weeks")]
        public int Playtime2Weeks { get; set; }

        [JsonPropertyName("img_icon_url")]
        public string? ImgIconUrl { get; set; }

        // Computed URLs
        public string? IconUrl => !string.IsNullOrEmpty(ImgIconUrl)
            ? $"https://media.steampowered.com/steamcommunity/public/images/apps/{AppId}/{ImgIconUrl}.jpg"
            : null;
        public string HeaderUrl => $"https://cdn.cloudflare.steamstatic.com/steam/apps/{AppId}/header.jpg";
        public string CapsuleUrl => $"https://cdn.cloudflare.steamstatic.com/steam/apps/{AppId}/capsule_231x87.jpg";
    }

    public class SteamProfile
    {
        public string? SteamId { get; set; }
        public string? PersonaName { get; set; }
        public string? ProfileUrl { get; set; }
        public string? Avatar { get; set; }
        public string? AvatarMedium { get; set; }
        public string? AvatarFull { get; set; }
        public int PersonaState { get; set; }
        public int CommunityVisibilityState { get; set; }
        public long? LastLogoff { get; set; }
        public string? RealName { get; set; }
        public string? CountryCode { get; set; }
        public string? GameId { get; set; }
        public string? GameExtraInfo { get; set; }
    }

    public class SteamFriend
    {
        public string? SteamId { get; set; }
        public string? Relationship { get; set; }
        public long FriendSince { get; set; }
        // Extended info from profile
        public string? PersonaName { get; set; }
        public string? Avatar { get; set; }
        public int PersonaState { get; set; }
        public string? CurrentGameName { get; set; }
    }

    #endregion

    #region API Methods

    /// <summary>
    /// Fetches the list of owned games for a Steam user
    /// </summary>
    public async Task<object> GetOwnedGames(string steamId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/IPlayerService/GetOwnedGames/v1/?key={STEAM_API_KEY}&steamid={steamId}&include_appinfo=true&include_played_free_games=true&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API responded with status: {response.StatusCode}", games = Array.Empty<object>() };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("response", out var resp) || !resp.TryGetProperty("games", out var gamesEl))
            {
                return new { success = false, error = "No se encontraron juegos. Asegúrate de que tu perfil de Steam es público.", games = Array.Empty<object>() };
            }

            var games = new List<object>();
            foreach (var game in gamesEl.EnumerateArray())
            {
                var appId = game.GetProperty("appid").GetInt32();
                var name = game.TryGetProperty("name", out var n) ? n.GetString() : "";
                var playtimeForever = game.TryGetProperty("playtime_forever", out var ptf) ? ptf.GetInt32() : 0;
                var playtime2Weeks = game.TryGetProperty("playtime_2weeks", out var pt2w) ? pt2w.GetInt32() : 0;
                var imgIconUrl = game.TryGetProperty("img_icon_url", out var icon) ? icon.GetString() : "";

                games.Add(new
                {
                    appid = appId,
                    name,
                    playtime_forever = playtimeForever,
                    playtime_2weeks = playtime2Weeks,
                    iconUrl = !string.IsNullOrEmpty(imgIconUrl)
                        ? $"https://media.steampowered.com/steamcommunity/public/images/apps/{appId}/{imgIconUrl}.jpg"
                        : null,
                    headerUrl = $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg",
                    capsuleUrl = $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/capsule_231x87.jpg"
                });
            }

            // Sort by playtime
            var sorted = games.OrderByDescending(g => ((dynamic)g).playtime_forever).ToList();
            var gameCount = resp.TryGetProperty("game_count", out var gc) ? gc.GetInt32() : games.Count;

            return new { success = true, games = sorted, gameCount };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, games = Array.Empty<object>() };
        }
    }

    /// <summary>
    /// Fetches Steam user profile information
    /// </summary>
    public async Task<object> GetPlayerSummary(string steamId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key={STEAM_API_KEY}&steamids={steamId}&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API responded with status: {response.StatusCode}" };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("response", out var resp) ||
                !resp.TryGetProperty("players", out var players) ||
                players.GetArrayLength() == 0)
            {
                return new { success = false, error = "No se encontró el perfil de Steam. Verifica tu Steam ID." };
            }

            var player = players[0];
            return new
            {
                success = true,
                profile = new
                {
                    steamId = player.GetProperty("steamid").GetString(),
                    personaName = player.TryGetProperty("personaname", out var pn) ? pn.GetString() : "",
                    profileUrl = player.TryGetProperty("profileurl", out var pu) ? pu.GetString() : "",
                    avatar = player.TryGetProperty("avatar", out var av) ? av.GetString() : "",
                    avatarMedium = player.TryGetProperty("avatarmedium", out var avm) ? avm.GetString() : "",
                    avatarFull = player.TryGetProperty("avatarfull", out var avf) ? avf.GetString() : "",
                    personaState = player.TryGetProperty("personastate", out var ps) ? ps.GetInt32() : 0,
                    communityVisibilityState = player.TryGetProperty("communityvisibilitystate", out var cvs) ? cvs.GetInt32() : 0,
                    lastLogoff = player.TryGetProperty("lastlogoff", out var lo) ? lo.GetInt64() : 0,
                    realName = player.TryGetProperty("realname", out var rn) ? rn.GetString() : null,
                    countryCode = player.TryGetProperty("loccountrycode", out var cc) ? cc.GetString() : null
                }
            };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Resolves a Steam vanity URL to a Steam ID
    /// </summary>
    public async Task<object> ResolveVanityURL(string vanityName)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/ISteamUser/ResolveVanityURL/v1/?key={STEAM_API_KEY}&vanityurl={vanityName}&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API responded with status: {response.StatusCode}" };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var resp = root.GetProperty("response");

            if (resp.GetProperty("success").GetInt32() == 1)
            {
                return new { success = true, steamId = resp.GetProperty("steamid").GetString() };
            }
            return new { success = false, error = "No se encontró el perfil con ese nombre personalizado" };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Fetches recently played games for a user
    /// </summary>
    public async Task<object> GetRecentlyPlayedGames(string steamId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/IPlayerService/GetRecentlyPlayedGames/v1/?key={STEAM_API_KEY}&steamid={steamId}&count=10&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API error: {response.StatusCode}", games = Array.Empty<object>() };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("response", out var resp) || !resp.TryGetProperty("games", out var gamesEl))
            {
                return new { success = true, games = Array.Empty<object>() };
            }

            var games = new List<object>();
            foreach (var game in gamesEl.EnumerateArray())
            {
                var appId = game.GetProperty("appid").GetInt32();
                games.Add(new
                {
                    appid = appId,
                    name = game.TryGetProperty("name", out var n) ? n.GetString() : "",
                    playtime_2weeks = game.TryGetProperty("playtime_2weeks", out var pt2w) ? pt2w.GetInt32() : 0,
                    playtime_forever = game.TryGetProperty("playtime_forever", out var ptf) ? ptf.GetInt32() : 0,
                    headerUrl = $"https://cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg"
                });
            }

            return new { success = true, games };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, games = Array.Empty<object>() };
        }
    }

    /// <summary>
    /// Gets player achievements for a specific game
    /// </summary>
    public async Task<object> GetPlayerAchievements(string steamId, int appId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/ISteamUserStats/GetPlayerAchievements/v1/?key={STEAM_API_KEY}&steamid={steamId}&appid={appId}&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = true, achievements = Array.Empty<object>() };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("playerstats", out var ps) || !ps.TryGetProperty("achievements", out var achievements))
            {
                return new { success = true, achievements = Array.Empty<object>() };
            }

            var result = new List<object>();
            foreach (var ach in achievements.EnumerateArray())
            {
                result.Add(new
                {
                    apiname = ach.TryGetProperty("apiname", out var an) ? an.GetString() : "",
                    achieved = ach.TryGetProperty("achieved", out var a) ? a.GetInt32() : 0,
                    unlocktime = ach.TryGetProperty("unlocktime", out var ut) ? ut.GetInt64() : 0
                });
            }

            return new { success = true, achievements = result };
        }
        catch
        {
            return new { success = true, achievements = Array.Empty<object>() };
        }
    }

    /// <summary>
    /// Gets the Steam level for a user
    /// </summary>
    public async Task<object> GetSteamLevel(string steamId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/IPlayerService/GetSteamLevel/v1/?key={STEAM_API_KEY}&steamid={steamId}&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API error: {response.StatusCode}", level = 0 };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var level = doc.RootElement.GetProperty("response").TryGetProperty("player_level", out var pl) ? pl.GetInt32() : 0;

            return new { success = true, level };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, level = 0 };
        }
    }

    /// <summary>
    /// Gets the Steam badges for a user
    /// </summary>
    public async Task<object> GetSteamBadges(string steamId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/IPlayerService/GetBadges/v1/?key={STEAM_API_KEY}&steamid={steamId}&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API error: {response.StatusCode}", badges = Array.Empty<object>() };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("response", out var resp))
            {
                return new { success = true, badges = Array.Empty<object>(), playerXp = 0, playerLevel = 0 };
            }

            var badges = new List<object>();
            if (resp.TryGetProperty("badges", out var badgesEl))
            {
                foreach (var badge in badgesEl.EnumerateArray())
                {
                    badges.Add(new
                    {
                        badgeid = badge.TryGetProperty("badgeid", out var bid) ? bid.GetInt32() : 0,
                        level = badge.TryGetProperty("level", out var lvl) ? lvl.GetInt32() : 0,
                        completion_time = badge.TryGetProperty("completion_time", out var ct) ? ct.GetInt64() : 0,
                        xp = badge.TryGetProperty("xp", out var xp) ? xp.GetInt32() : 0
                    });
                }
            }

            return new
            {
                success = true,
                badges,
                playerXp = resp.TryGetProperty("player_xp", out var pxp) ? pxp.GetInt32() : 0,
                playerLevel = resp.TryGetProperty("player_level", out var pl) ? pl.GetInt32() : 0,
                playerXpNeededToLevelUp = resp.TryGetProperty("player_xp_needed_to_level_up", out var pxnlu) ? pxnlu.GetInt32() : 0
            };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, badges = Array.Empty<object>() };
        }
    }

    /// <summary>
    /// Gets the friend list for a user
    /// </summary>
    public async Task<object> GetFriendList(string steamId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/ISteamUser/GetFriendList/v1/?key={STEAM_API_KEY}&steamid={steamId}&relationship=friend&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    return new { success = false, error = "Lista de amigos privada", friends = Array.Empty<object>() };
                }
                return new { success = false, error = $"Steam API error: {response.StatusCode}", friends = Array.Empty<object>() };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("friendslist", out var fl) || !fl.TryGetProperty("friends", out var friendsEl))
            {
                return new { success = true, friends = Array.Empty<object>() };
            }

            var friends = new List<object>();
            foreach (var friend in friendsEl.EnumerateArray())
            {
                friends.Add(new
                {
                    steamId = friend.GetProperty("steamid").GetString(),
                    relationship = friend.TryGetProperty("relationship", out var r) ? r.GetString() : "friend",
                    friendSince = friend.TryGetProperty("friend_since", out var fs) ? fs.GetInt64() : 0
                });
            }

            return new { success = true, friends };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, friends = Array.Empty<object>() };
        }
    }

    /// <summary>
    /// Gets detailed summaries for multiple Steam users
    /// </summary>
    public async Task<object> GetPlayersSummaries(string[] steamIds)
    {
        try
        {
            if (steamIds == null || steamIds.Length == 0)
            {
                return new { success = true, players = Array.Empty<object>() };
            }

            var ids = string.Join(",", steamIds.Take(100));
            var url = $"{STEAM_API_BASE}/ISteamUser/GetPlayerSummaries/v2/?key={STEAM_API_KEY}&steamids={ids}&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API error: {response.StatusCode}", players = Array.Empty<object>() };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (!root.TryGetProperty("response", out var resp) || !resp.TryGetProperty("players", out var playersEl))
            {
                return new { success = true, players = Array.Empty<object>() };
            }

            var stateMap = new Dictionary<int, string>
            {
                { 0, "offline" }, { 1, "online" }, { 2, "busy" },
                { 3, "away" }, { 4, "snooze" }, { 5, "looking_to_trade" }, { 6, "looking_to_play" }
            };

            var players = new List<object>();
            foreach (var player in playersEl.EnumerateArray())
            {
                var personaState = player.TryGetProperty("personastate", out var ps) ? ps.GetInt32() : 0;
                var gameId = player.TryGetProperty("gameid", out var gid) ? gid.GetString() : null;

                players.Add(new
                {
                    steamId = player.GetProperty("steamid").GetString(),
                    personaName = player.TryGetProperty("personaname", out var pn) ? pn.GetString() : "",
                    profileUrl = player.TryGetProperty("profileurl", out var pu) ? pu.GetString() : "",
                    avatar = player.TryGetProperty("avatar", out var av) ? av.GetString() : "",
                    avatarMedium = player.TryGetProperty("avatarmedium", out var avm) ? avm.GetString() : "",
                    avatarFull = player.TryGetProperty("avatarfull", out var avf) ? avf.GetString() : "",
                    personaState,
                    personaStateString = stateMap.GetValueOrDefault(personaState, "offline"),
                    currentGame = gameId != null ? new
                    {
                        gameId,
                        gameName = player.TryGetProperty("gameextrainfo", out var gei) ? gei.GetString() : "Unknown Game"
                    } : null,
                    lastLogoff = player.TryGetProperty("lastlogoff", out var lo) ? lo.GetInt64() : 0
                });
            }

            return new { success = true, players };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, players = Array.Empty<object>() };
        }
    }

    /// <summary>
    /// Gets friends with their current status and game info
    /// </summary>
    public async Task<object> GetFriendsWithStatus(string steamId)
    {
        try
        {
            // Get friend list
            var friendListResult = await GetFriendList(steamId);
            var friendListJson = JsonSerializer.Serialize(friendListResult);
            using var friendDoc = JsonDocument.Parse(friendListJson);
            var friendRoot = friendDoc.RootElement;

            if (!friendRoot.TryGetProperty("success", out var success) || !success.GetBoolean())
            {
                return friendListResult;
            }

            if (!friendRoot.TryGetProperty("friends", out var friendsEl) || friendsEl.GetArrayLength() == 0)
            {
                return friendListResult;
            }

            // Collect friend IDs
            var friendIds = new List<string>();
            foreach (var f in friendsEl.EnumerateArray())
            {
                if (f.TryGetProperty("steamId", out var fid))
                {
                    friendIds.Add(fid.GetString()!);
                }
            }

            // Get summaries
            var summariesResult = await GetPlayersSummaries(friendIds.ToArray());
            var summariesJson = JsonSerializer.Serialize(summariesResult);
            using var summariesDoc = JsonDocument.Parse(summariesJson);
            var summariesRoot = summariesDoc.RootElement;

            if (!summariesRoot.TryGetProperty("players", out var playersEl))
            {
                return friendListResult;
            }

            // Build player map
            var playerMap = new Dictionary<string, JsonElement>();
            foreach (var p in playersEl.EnumerateArray())
            {
                if (p.TryGetProperty("steamId", out var sid))
                {
                    playerMap[sid.GetString()!] = p;
                }
            }

            // Combine data
            var friends = new List<object>();
            foreach (var f in friendsEl.EnumerateArray())
            {
                var fid = f.GetProperty("steamId").GetString()!;
                if (playerMap.TryGetValue(fid, out var playerInfo))
                {
                    friends.Add(new
                    {
                        steamId = fid,
                        friendSince = f.TryGetProperty("friendSince", out var fs) ? fs.GetInt64() : 0,
                        personaName = playerInfo.TryGetProperty("personaName", out var pn) ? pn.GetString() : "",
                        avatar = playerInfo.TryGetProperty("avatar", out var av) ? av.GetString() : "",
                        avatarFull = playerInfo.TryGetProperty("avatarFull", out var avf) ? avf.GetString() : "",
                        personaState = playerInfo.TryGetProperty("personaState", out var ps) ? ps.GetInt32() : 0,
                        personaStateString = playerInfo.TryGetProperty("personaStateString", out var pss) ? pss.GetString() : "offline",
                        currentGame = playerInfo.TryGetProperty("currentGame", out var cg) && cg.ValueKind != JsonValueKind.Null ? (object?)cg.Clone() : null
                    });
                }
            }

            // Sort: in-game first, then online, then by name
            var sorted = friends.OrderByDescending(f =>
            {
                var json = JsonSerializer.Serialize(f);
                using var doc = JsonDocument.Parse(json);
                var hasGame = doc.RootElement.TryGetProperty("currentGame", out var cg) && cg.ValueKind != JsonValueKind.Null;
                var state = doc.RootElement.TryGetProperty("personaState", out var ps) ? ps.GetInt32() : 0;
                return hasGame ? 2 : (state > 0 ? 1 : 0);
            }).ToList();

            return new { success = true, friends = sorted };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, friends = Array.Empty<object>() };
        }
    }

    /// <summary>
    /// Gets the number of current players for a specific game
    /// </summary>
    public async Task<object> GetCurrentPlayerCount(int appId)
    {
        try
        {
            var url = $"{STEAM_API_BASE}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid={appId}&format=json";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam API error: {response.StatusCode}", playerCount = 0 };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var count = doc.RootElement.GetProperty("response").TryGetProperty("player_count", out var pc) ? pc.GetInt32() : 0;

            return new { success = true, playerCount = count };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, playerCount = 0 };
        }
    }

    /// <summary>
    /// Launches a specific Steam game
    /// </summary>
    public object LaunchGame(string appId)
    {
        try
        {
            var url = $"steam://rungameid/{appId}";
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
            return new { success = true };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    /// <summary>
    /// Gets review statistics for a game from Steam Store API
    /// </summary>
    public async Task<object> GetGameReviews(int appId)
    {
        try
        {
            // Note: This is checking the public store API, not the user API
            var url = $"https://store.steampowered.com/appreviews/{appId}?json=1&language=all&purchase_type=all";
            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
            {
                return new { success = false, error = $"Steam Store API error: {response.StatusCode}", reviews = (object?)null };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("success", out var s) && s.GetInt32() == 1 && root.TryGetProperty("query_summary", out var summary))
            {
                var scoreDesc = summary.TryGetProperty("review_score_desc", out var sd) ? sd.GetString() : "N/A";
                var total = summary.TryGetProperty("total_reviews", out var t) ? t.GetInt32() : 0;
                var positive = summary.TryGetProperty("total_positive", out var p) ? p.GetInt32() : 0;
                var negative = summary.TryGetProperty("total_negative", out var n) ? n.GetInt32() : 0;

                return new
                {
                    success = true,
                    reviews = new
                    {
                        scoreDescription = scoreDesc,
                        total,
                        positive,
                        negative,
                        percentage = total > 0 ? (int)((double)positive / total * 100) : 0
                    }
                };
            }

            return new { success = false, error = "Invalid response format", reviews = (object?)null };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message, reviews = (object?)null };
        }
    }

    /// <summary>
    /// Detects local Steam installation and logged-in user
    /// </summary>
    public object GetLocalInfo()
    {
        try
        {
            string? installPath = null;

            // 1. Try Registry
            try
            {
                using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Valve\Steam");
                if (key?.GetValue("SteamPath") is string iPath)
                {
                    installPath = iPath.Replace("/", "\\");
                }
            }
            catch { }

            // 2. Fallback to common paths
            if (string.IsNullOrEmpty(installPath))
            {
                var paths = new[] {
                    @"C:\Program Files (x86)\Steam",
                    @"C:\Program Files\Steam",
                    @"D:\Steam"
                };
                foreach (var p in paths)
                {
                    if (System.IO.Directory.Exists(p))
                    {
                        installPath = p;
                        break;
                    }
                }
            }

            if (string.IsNullOrEmpty(installPath))
            {
                return new { success = true, steamInstalled = false };
            }

            // 3. Try to read loginusers.vdf
            dynamic? user = null;
            try
            {
                var loginFile = System.IO.Path.Combine(installPath, "config", "loginusers.vdf");
                if (System.IO.File.Exists(loginFile))
                {
                    var lines = System.IO.File.ReadAllLines(loginFile);




                    // Extremely basic VDF parser specifically for loginusers.vdf format
                    // Matches: "7656..." { ... "AccountName" "..." ... "MostRecent" "1" ... }

                    // Note: A proper VDF parser is better, but this regex/loop approach works for 99% of cases without extra deps
                    // We scan for the pattern of steamid -> props

                    var content = System.IO.File.ReadAllText(loginFile);

                    // Look for the block with "MostRecent"		"1"
                    // This is hacky, but VDF is proprietary.
                    // Instead, let's just assume if we find a file, we are installed. 
                    // Getting the exact user is a nice-to-have auth-fill.

                    // Simple regex for SteamID 64
                    var matches = System.Text.RegularExpressions.Regex.Matches(content, "\"(\\d{17})\"");
                    if (matches.Count > 0)
                    {
                        // Take the first one, it's often the logged in one or last used
                        var steamId = matches[0].Groups[1].Value;

                        // Try to find AccountName
                        var nameMatch = System.Text.RegularExpressions.Regex.Match(content, "\"AccountName\"\\s+\"([^\"]+)\"");
                        var accountName = nameMatch.Success ? nameMatch.Groups[1].Value : "Unknown";

                        user = new
                        {
                            steamId = steamId,
                            personaName = accountName,
                            timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                            mostRecent = true
                        };
                    }
                }
            }
            catch { }

            return new
            {
                success = true,
                steamInstalled = true,
                steamPath = installPath,
                user = user
            };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    #endregion
}
