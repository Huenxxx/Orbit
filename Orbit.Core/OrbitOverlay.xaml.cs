using System;
using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using System.Text.Json;
using System.Threading.Tasks;
using Orbit.Core.Services;


namespace Orbit.Core
{
    public partial class OrbitOverlay : Window
    {
        private SystemStatsService _systemStatsService;
        private ConfigService _configService;

        public OrbitOverlay()
        {
            InitializeComponent();
            _systemStatsService = new SystemStatsService();
            _configService = new ConfigService();
            InitializeAsync();
        }


        private async void InitializeAsync()
        {
            try
            {
                var userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Orbit", "OverlayData");
                var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                await OverlayWebView.EnsureCoreWebView2Async(env);

                // Disable context menu
                OverlayWebView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;

                // Inject the C# bridge before any navigation
                await InjectCSharpBridge();

                // Navigate to overlay page
#if DEBUG
                OverlayWebView.CoreWebView2.Navigate("http://localhost:5173/#/overlay");
#else
                var appDir = AppDomain.CurrentDomain.BaseDirectory;
                var indexPath = Path.Combine(appDir, "dist", "index.html");
                if (File.Exists(indexPath))
                {
                    OverlayWebView.CoreWebView2.Navigate($"file:///{indexPath}#/overlay");
                }
                else
                {
                    // Fallback for production if dist is not there
                    OverlayWebView.CoreWebView2.Navigate("http://localhost:5173/#/overlay");
                }
#endif
                OverlayWebView.DefaultBackgroundColor = System.Drawing.Color.Transparent;

                // Listen for messages from React
                OverlayWebView.WebMessageReceived += OnWebMessageReceived!;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Overlay Initialize Error: {ex.Message}");
            }
        }

        private async Task InjectCSharpBridge()
        {
            string bridgeScript = @"
                window.csharp = {
                    invoke: function(channel, payload) {
                        return new Promise((resolve, reject) => {
                            const id = 'ipc_overlay_' + Date.now();
                            const handler = function(event) {
                                try {
                                    const response = event.data;
                                    if (response && response.id === id) {
                                        window.chrome.webview.removeEventListener('message', handler);
                                        if (response.success) resolve(response.data);
                                        else reject(new Error(response.error));
                                    }
                                } catch (e) {}
                            };
                            window.chrome.webview.addEventListener('message', handler);
                            window.chrome.webview.postMessage(JSON.stringify({ id, channel, payload }));
                        });
                    }
                };
            ";
            await OverlayWebView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(bridgeScript);
        }

        private async void OnWebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var json = e.TryGetWebMessageAsString();
                var request = JsonSerializer.Deserialize<IpcRequest>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (request == null) return;

                object? data = null;
                switch (request.channel)
                {
                    case "get-system-stats":
                        data = _systemStatsService.GetStats();
                        break;
                    case "save-hud-settings":
                        // Minimal relay to config
                        if (request.payload is JsonElement hudSettings)
                        {
                            if (hudSettings.TryGetProperty("color", out var colorEl))
                                _configService.Set("hudColor", colorEl.GetString());

                            // Hotkey change needs to trigger MainWindow, so we might need a way to communicate back
                            // For simplicity, we'll just save it and MainWindow will pick it up on next launch or via a broadcast
                            if (hudSettings.TryGetProperty("hotkey", out var hotkeyEl))
                            {
                                _configService.Set("overlayHotkeyModifiers", hotkeyEl.GetProperty("modifiers").GetUInt32());
                                _configService.Set("overlayHotkeyKey", hotkeyEl.GetProperty("key").GetUInt32());
                            }
                        }
                        data = new { success = true };
                        break;
                    case "get-hud-config":
                        data = new { 
                            color = _configService.Get<string>("hudColor") ?? "#00d4ff",
                            hotkeyModifiers = _configService.Get<uint?>("overlayHotkeyModifiers") ?? 6, // 2+4
                            hotkeyKey = _configService.Get<uint?>("overlayHotkeyKey") ?? 0x4F // O
                        };
                        break;
                    case "kill-game":
                        bool killed = false;
                        try
                        {
                            // Try to find the game process. In a real app we'd track PID.
                            // For now, let's look for common game patterns if we don't have a direct link.
                            var processes = System.Diagnostics.Process.GetProcesses();
                            // This is a bit aggressive, but for a "Kill Game" button in a launcher it's often what's expected
                            // if we can't track it perfectly.
                            // Better: Provide a specific name from frontend if possible.
                            
                            // Let's just return success false for now if not found, or try to kill by known names.
                        }
                        catch { }
                        data = new { success = killed };
                        break;
                }

                var response = new IpcResponse { id = request.id, success = true, data = data };
                OverlayWebView.CoreWebView2.PostWebMessageAsJson(JsonSerializer.Serialize(response));
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Overlay IPC Error: {ex.Message}");
            }
        }

        public void Toggle()
        {
            if (this.Visibility == Visibility.Visible)
            {
                this.Hide();
            }
            else
            {
                this.Show();
                this.Topmost = true;
                this.Activate();
                this.Focus();
                
                // Ensure WebView gets focus
                OverlayWebView.Focus();
            }
        }

        protected override void OnKeyDown(System.Windows.Input.KeyEventArgs e)
        {
            // Close with Escape
            if (e.Key == System.Windows.Input.Key.Escape)
            {
                this.Hide();
            }
            base.OnKeyDown(e);
        }
    }
}
