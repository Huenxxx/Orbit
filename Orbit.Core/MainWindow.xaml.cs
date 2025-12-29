using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Orbit.Core.Services;

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

    public MainWindow()
    {
        InitializeComponent();
        _configService = new ConfigService();
        InitializeAsync();
    }

    async void InitializeAsync()
    {
        // Ensure WebView2 is ready
        await MainWebView.EnsureCoreWebView2Async(null);
        
        // Listen for messages from React
        MainWebView.WebMessageReceived += MainWebView_WebMessageReceived;
    }

    private async void MainWebView_WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var json = e.TryGetWebMessageAsString();
            // Case-insensitive deserialization is safer for JSON interaction
            var request = JsonSerializer.Deserialize<IpcRequest>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (request != null)
            {
                await HandleIpcRequest(request);
            }
        }
        catch (Exception ex)
        {
            // Ideally send a generic error back if ID failed to parse, but here we just log
            System.Diagnostics.Debug.WriteLine($"IPC Error: {ex.Message}");
        }
    }

    private async Task HandleIpcRequest(IpcRequest request)
    {
        try
        {
            object result = null;
            
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
                        // Payload comes as JsonElement because 'object' type in IpcRequest
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
                    this.Dispatcher.Invoke(() => this.Close());
                    result = new { success = true };
                    break;
                case "window-drag":
                    this.Dispatcher.Invoke(() => {
                        try { this.DragMove(); } catch { /* Ignore if not primary button */ }
                    });
                    result = new { success = true };
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

    private void SendResponse(string id, bool success, object data, string error = null)
    {
        var response = new IpcResponse { id = id, success = success, data = data, error = error };
        var json = JsonSerializer.Serialize(response);
        MainWebView.CoreWebView2.PostWebMessageAsJson(json);
    }
}