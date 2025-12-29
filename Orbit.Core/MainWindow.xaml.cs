using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Interop;
using Microsoft.Web.WebView2.Core;
using Orbit.Core.Services;
using Forms = System.Windows.Forms;
using Drawing = System.Drawing;

namespace Orbit.Core;

// IPC Classes (must match TypeScript interfaces)
public class IpcRequest
{
    public string? id { get; set; }
    public string? channel { get; set; }
    public object? payload { get; set; }
}

public class IpcResponse
{
    public string? id { get; set; }
    public bool success { get; set; }
    public object? data { get; set; }
    public string? error { get; set; }
}

/// <summary>
/// Interaction logic for MainWindow.xaml
/// </summary>
public partial class MainWindow : Window
{
    private ConfigService _configService;
    private AstraOverlay? _astraOverlay;
    private Forms.NotifyIcon? _notifyIcon;
    private bool _isClosingToTray = true;

    public MainWindow()
    {
        InitializeComponent();
        _configService = new ConfigService();
        SetupSystemTray();
        InitializeAsync();
    }

    private void SetupSystemTray()
    {
        _notifyIcon = new Forms.NotifyIcon();
        _notifyIcon.Text = "Orbit - Game Library Manager";
        
        // Create icon programmatically (simple orbit design)
        _notifyIcon.Icon = CreateOrbitIcon();
        
        // Context menu
        var contextMenu = new Forms.ContextMenuStrip();
        contextMenu.Items.Add("Mostrar Orbit", null, (s, e) => ShowWindow());
        contextMenu.Items.Add("Iniciar Astra Overlay", null, (s, e) => StartAstraOverlay());
        contextMenu.Items.Add("-"); // Separator
        contextMenu.Items.Add("Salir", null, (s, e) => ExitApplication());
        
        _notifyIcon.ContextMenuStrip = contextMenu;
        _notifyIcon.DoubleClick += (s, e) => ShowWindow();
        _notifyIcon.Visible = true;
    }

    private Drawing.Icon CreateOrbitIcon()
    {
        // Create a simple icon programmatically
        var bitmap = new Drawing.Bitmap(32, 32);
        using (var g = Drawing.Graphics.FromImage(bitmap))
        {
            g.Clear(Drawing.Color.FromArgb(10, 10, 15));
            
            // Outer ring
            using var pen = new Drawing.Pen(Drawing.Color.FromArgb(99, 102, 241), 2);
            g.DrawEllipse(pen, 4, 4, 24, 24);
            
            // Core
            using var brush = new Drawing.SolidBrush(Drawing.Color.FromArgb(6, 182, 212));
            g.FillEllipse(brush, 12, 12, 8, 8);
            
            // Small orbiting dot
            using var pinkBrush = new Drawing.SolidBrush(Drawing.Color.FromArgb(244, 114, 182));
            g.FillEllipse(pinkBrush, 14, 2, 4, 4);
        }
        
        return Drawing.Icon.FromHandle(bitmap.GetHicon());
    }

    private void ShowWindow()
    {
        this.Show();
        this.WindowState = WindowState.Normal;
        this.Activate();
    }

    private void StartAstraOverlay()
    {
        Dispatcher.Invoke(() =>
        {
            if (_astraOverlay == null || !_astraOverlay.IsLoaded)
            {
                _astraOverlay = new AstraOverlay();
            }
            _astraOverlay.StartService();
        });
    }

    private void ExitApplication()
    {
        _isClosingToTray = false;
        _notifyIcon?.Dispose();
        _astraOverlay?.StopService();
        _astraOverlay?.Close();
        System.Windows.Application.Current.Shutdown();
    }

    async void InitializeAsync()
    {
        // Ensure WebView2 is ready
        await MainWebView.EnsureCoreWebView2Async(null);
        
        // Listen for messages from React
        MainWebView.WebMessageReceived += MainWebView_WebMessageReceived;
        
        // Inject the C# bridge into the page
        await InjectCSharpBridge();
    }

    private async Task InjectCSharpBridge()
    {
        // Inject a global csharp object that React can use
        string bridgeScript = @"
            window.csharp = {
                invoke: function(channel, payload) {
                    return new Promise((resolve, reject) => {
                        const id = 'ipc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        
                        const handler = function(event) {
                            try {
                                const response = JSON.parse(event.data);
                                if (response.id === id) {
                                    window.chrome.webview.removeEventListener('message', handler);
                                    if (response.success) {
                                        resolve(response.data);
                                    } else {
                                        reject(new Error(response.error || 'Unknown error'));
                                    }
                                }
                            } catch (e) {}
                        };
                        
                        window.chrome.webview.addEventListener('message', handler);
                        
                        window.chrome.webview.postMessage(JSON.stringify({
                            id: id,
                            channel: channel,
                            payload: payload
                        }));
                        
                        // Timeout after 30 seconds
                        setTimeout(() => {
                            window.chrome.webview.removeEventListener('message', handler);
                            reject(new Error('Request timeout'));
                        }, 30000);
                    });
                },
                
                // Shorthand methods for window controls
                minimize: function() { return this.invoke('window-minimize'); },
                maximize: function() { return this.invoke('window-maximize'); },
                close: function() { return this.invoke('window-close'); },
                drag: function() { return this.invoke('window-drag'); }
            };
            
            console.log('[Orbit] C# bridge injected successfully');
        ";

        await MainWebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(bridgeScript);
    }

    private async void MainWebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var json = e.TryGetWebMessageAsString();
            var request = JsonSerializer.Deserialize<IpcRequest>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (request != null)
            {
                await HandleIpcRequest(request);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"IPC Error: {ex.Message}");
        }
    }

    private async Task HandleIpcRequest(IpcRequest request)
    {
        try
        {
            object? result = null;
            
            switch (request.channel)
            {
                case "steam-login":
                    var steamService = new SteamAuthService();
                    var steamId = await steamService.StartSteamAuth();
                    result = new { success = steamId != null, steamId = steamId };
                    break;

                case "epic-set-api-keys":
                    if (request.payload is JsonElement p)
                    {
                        var keys = JsonSerializer.Deserialize<Dictionary<string, string>>(p.GetRawText());
                        _configService.Set("epicKeys", keys);
                        result = new { success = true };
                    }
                    else 
                    {
                        result = new { success = false, error = "Invalid payload format" };
                    }
                    break;
                    
                case "epic-get-api-keys":
                    var storedKeys = _configService.Get<Dictionary<string, string>>("epicKeys");
                    result = storedKeys ?? new Dictionary<string, string>();
                    break;

                // Window Controls
                case "window-minimize":
                    this.Dispatcher.Invoke(() => this.WindowState = WindowState.Minimized);
                    result = new { success = true };
                    break;
                case "window-maximize":
                    this.Dispatcher.Invoke(() => {
                        if (this.WindowState == WindowState.Maximized)
                            this.WindowState = WindowState.Normal;
                        else
                            this.WindowState = WindowState.Maximized;
                    });
                    result = new { success = true };
                    break;
                case "window-close":
                    this.Dispatcher.Invoke(() => {
                        if (_isClosingToTray)
                        {
                            this.Hide();
                        }
                        else
                        {
                            this.Close();
                        }
                    });
                    result = new { success = true };
                    break;
                case "window-drag":
                    this.Dispatcher.Invoke(() => {
                        try { this.DragMove(); } catch { /* Ignore if not primary button */ }
                    });
                    result = new { success = true };
                    break;

                // Astra Overlay
                case "astra-start-service":
                    this.Dispatcher.Invoke(() => {
                        if (_astraOverlay == null || !_astraOverlay.IsLoaded)
                        {
                            _astraOverlay = new AstraOverlay();
                        }
                        _astraOverlay.StartService();
                    });
                    result = new { success = true, message = "Astra overlay service started. Hold TAB during game to show." };
                    break;

                case "astra-stop-service":
                    this.Dispatcher.Invoke(() => {
                        if (_astraOverlay != null)
                        {
                            _astraOverlay.StopService();
                            _astraOverlay.Close();
                            _astraOverlay = null;
                        }
                    });
                    result = new { success = true, message = "Astra overlay service stopped." };
                    break;

                case "astra-get-status":
                    bool isRunning = false;
                    bool isClientConnected = false;
                    bool isInGame = false;
                    int port = 0;
                    
                    this.Dispatcher.Invoke(() => {
                        if (_astraOverlay != null && _astraOverlay.IsServiceRunning)
                        {
                            isRunning = true;
                            var service = _astraOverlay.LeagueService;
                            isClientConnected = service.IsClientRunning;
                            isInGame = service.IsInGame;
                            port = service.CurrentClient?.Port ?? 0;
                        }
                    });
                    
                    result = new { 
                        serviceRunning = isRunning,
                        clientConnected = isClientConnected,
                        inGame = isInGame,
                        port = port
                    };
                    break;

                // Get current summoner account info
                case "astra-get-summoner":
                    Services.SummonerInfo? summoner = null;
                    this.Dispatcher.Invoke(async () => {
                        if (_astraOverlay?.LeagueService != null)
                        {
                            summoner = await _astraOverlay.LeagueService.GetCurrentSummoner();
                        }
                    });
                    // Wait a bit for async to complete
                    await Task.Delay(100);
                    if (summoner != null)
                    {
                        result = new {
                            displayName = summoner.DisplayName,
                            summonerId = summoner.SummonerId,
                            accountId = summoner.AccountId,
                            profileIconId = summoner.ProfileIconId,
                            summonerLevel = summoner.SummonerLevel,
                            profileIconUrl = $"https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/{summoner.ProfileIconId}.png"
                        };
                    }
                    else
                    {
                        result = null;
                    }
                    break;

                // Get ranked stats
                case "astra-get-ranked":
                    Services.RankedStats? ranked = null;
                    this.Dispatcher.Invoke(async () => {
                        if (_astraOverlay?.LeagueService != null)
                        {
                            ranked = await _astraOverlay.LeagueService.GetRankedStats();
                        }
                    });
                    await Task.Delay(100);
                    if (ranked != null)
                    {
                        result = new {
                            soloTier = ranked.SoloTier,
                            soloDivision = ranked.SoloDivision,
                            soloLP = ranked.SoloLP,
                            soloWins = ranked.SoloWins,
                            soloLosses = ranked.SoloLosses,
                            soloWinRate = ranked.SoloWinRate,
                            flexTier = ranked.FlexTier,
                            flexDivision = ranked.FlexDivision
                        };
                    }
                    else
                    {
                        result = null;
                    }
                    break;

                // Get champ select session
                case "astra-get-champ-select":
                    Services.ChampSelectSession? champSelect = null;
                    this.Dispatcher.Invoke(async () => {
                        if (_astraOverlay?.LeagueService != null)
                        {
                            champSelect = await _astraOverlay.LeagueService.GetChampSelectSession();
                        }
                    });
                    await Task.Delay(100);
                    if (champSelect != null)
                    {
                        result = new {
                            gameId = champSelect.GameId,
                            isInChampSelect = true,
                            assignedPosition = champSelect.AssignedPosition,
                            championId = champSelect.ChampionId,
                            phase = champSelect.Phase,
                            timeRemaining = champSelect.TimeRemaining,
                            myTeamBans = champSelect.MyTeamBans,
                            enemyTeamBans = champSelect.EnemyTeamBans
                        };
                    }
                    else
                    {
                        result = new { isInChampSelect = false };
                    }
                    break;

                // Get owned champions
                case "astra-get-owned-champions":
                    List<Services.OwnedChampion>? ownedChamps = null;
                    this.Dispatcher.Invoke(async () => {
                        if (_astraOverlay?.LeagueService != null)
                        {
                            ownedChamps = await _astraOverlay.LeagueService.GetOwnedChampions();
                        }
                    });
                    await Task.Delay(100);
                    if (ownedChamps != null)
                    {
                        result = ownedChamps.Select(c => new {
                            id = c.Id,
                            name = c.Name,
                            alias = c.Alias
                        }).ToList();
                    }
                    else
                    {
                        result = new List<object>();
                    }
                    break;

                case "astra-get-champion-roles":
                    int roleChampId = 0;
                    if (request.payload != null && request.payload is JsonElement roleEl && roleEl.ValueKind == JsonValueKind.Number)
                        roleChampId = roleEl.GetInt32();
                    
                    result = await _astraOverlay.LeagueService.GetChampionRoles(roleChampId);
                    break;

                // Import runes
                case "astra-import-runes":
                    var runesData = ((JsonElement)request.payload).Deserialize<Dictionary<string, object>>();
                    bool imported = false;
                    
                    if (runesData != null)
                    {
                        string name = runesData["name"].ToString() ?? "Orbit Build";
                        int primaryStyleId = int.Parse(runesData["primaryStyleId"].ToString() ?? "0");
                        int subStyleId = int.Parse(runesData["subStyleId"].ToString() ?? "0");
                        
                        // Parse list manually as Deserialize might be tricky with boxing
                        var perkString = runesData["selectedPerkIds"].ToString(); // Assume it comes as a JSON array string if parsed
                        // If it's a JsonElement array:
                        var perksElement = ((JsonElement)request.payload).GetProperty("selectedPerkIds");
                        var selectedPerkIds = perksElement.EnumerateArray().Select(x => x.GetInt32()).ToList();

                        this.Dispatcher.Invoke(async () => {
                            if (_astraOverlay?.LeagueService != null)
                            {
                                imported = await _astraOverlay.LeagueService.SetRunePage(name, primaryStyleId, subStyleId, selectedPerkIds);
                            }
                        });
                        
                        // Wait briefly
                        await Task.Delay(200);
                    }
                    
                    result = new { success = imported };
                    break;

                // Import spells
                case "astra-import-spells":
                    var spellData = ((JsonElement)request.payload).Deserialize<Dictionary<string, int>>();
                    bool spellsImported = false;
                    if (spellData != null) 
                    {
                        this.Dispatcher.Invoke(async () => {
                            if (_astraOverlay?.LeagueService != null)
                            {
                                spellsImported = await _astraOverlay.LeagueService.SetSummonerSpells(spellData["spell1Id"], spellData["spell2Id"]);
                            }
                        });
                        await Task.Delay(100);
                    }
                    result = new { success = spellsImported };
                    break;

                // Import item set
                case "astra-import-items":
                    var itemSetData = ((JsonElement)request.payload); 
                    bool itemsImported = false;
                    
                    if (itemSetData.ValueKind == JsonValueKind.Object)
                    {
                         int championId = itemSetData.GetProperty("championId").GetInt32();
                         
                         this.Dispatcher.Invoke(async () => {
                            if (_astraOverlay?.LeagueService != null)
                            {
                                var set = itemSetData.GetProperty("itemSet").Deserialize<Services.ItemSet>();
                                if (set != null) {
                                    itemsImported = await _astraOverlay.LeagueService.SetItemSet(championId, set);
                                }
                            }
                        });
                        await Task.Delay(200);
                    }
                    result = new { success = itemsImported };
                    break;

                default:
                    System.Diagnostics.Debug.WriteLine($"Unknown Channel: {request.channel}");
                    break;
            }

            SendResponse(request.id, true, result);
        }
        catch (Exception ex)
        {
            SendResponse(request.id, false, null, ex.Message);
        }
    }

    private void SendResponse(string? id, bool success, object? data, string? error = null)
    {
        var response = new IpcResponse { id = id, success = success, data = data, error = error };
        var json = JsonSerializer.Serialize(response);
        MainWebView.CoreWebView2.PostWebMessageAsJson(json);
    }

    protected override void OnClosing(System.ComponentModel.CancelEventArgs e)
    {
        if (_isClosingToTray)
        {
            e.Cancel = true;
            this.Hide();
            
            // Show notification on first minimize
            if (_notifyIcon != null)
            {
                _notifyIcon.ShowBalloonTip(2000, "Orbit", "La aplicación sigue ejecutándose en la bandeja del sistema.", Forms.ToolTipIcon.Info);
            }
        }
        else
        {
            base.OnClosing(e);
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        _notifyIcon?.Dispose();
        _astraOverlay?.StopService();
        _astraOverlay?.Close();
        base.OnClosed(e);
    }
}