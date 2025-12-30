using System.IO;
using System.Text.Json;
using MonoTorrent;
using MonoTorrent.Client;

namespace Orbit.Core.Services;

/// <summary>
/// Torrent download service using MonoTorrent
/// </summary>
public class TorrentService : IDisposable
{
    private ClientEngine? _engine;
    private readonly Dictionary<string, TorrentManager> _activeDownloads = new();
    private readonly Dictionary<string, CancellationTokenSource> _progressCancellations = new();
    private readonly string _downloadPath;
    private readonly string _configPath;
    private Action<string, object>? _onProgress;
    private Action<string, object>? _onComplete;
    private Action<string, object>? _onError;

    private static readonly string[] TRACKERS = {
        "udp://tracker.opentrackr.org:1337/announce",
        "udp://open.stealth.si:80/announce",
        "udp://tracker.torrent.eu.org:451/announce",
        "udp://exodus.desync.com:6969/announce",
        "udp://tracker.openbittorrent.com:6969/announce",
        "udp://tracker.moeking.me:6969/announce",
        "udp://explodie.org:6969/announce",
        "udp://tracker.dler.org:6969/announce",
        "udp://open.demonii.com:1337/announce"
    };

    public TorrentService()
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        _downloadPath = Path.Combine(localAppData, "Orbit", "Games");
        _configPath = Path.Combine(localAppData, "Orbit", "torrent-config");

        Directory.CreateDirectory(_downloadPath);
        Directory.CreateDirectory(_configPath);
    }

    #region Public Properties

    public string DownloadPath => _downloadPath;

    #endregion

    #region Event Handlers

    public void SetProgressHandler(Action<string, object> handler) => _onProgress = handler;
    public void SetCompleteHandler(Action<string, object> handler) => _onComplete = handler;
    public void SetErrorHandler(Action<string, object> handler) => _onError = handler;

    #endregion

    #region Engine Management

    private async Task<ClientEngine> GetEngine()
    {
        if (_engine == null)
        {
            var settings = new EngineSettingsBuilder
            {
                AllowPortForwarding = true,
                AutoSaveLoadDhtCache = true,
                AutoSaveLoadFastResume = true,
                AutoSaveLoadMagnetLinkMetadata = true,
                ListenEndPoints = new Dictionary<string, System.Net.IPEndPoint> 
                { 
                    { "ipv4", new System.Net.IPEndPoint(System.Net.IPAddress.Any, 0) }
                },
                DhtEndPoint = new System.Net.IPEndPoint(System.Net.IPAddress.Any, 0),
                MaximumConnections = 100,
                MaximumDownloadRate = 0, // Unlimited
                MaximumUploadRate = 0,
                CacheDirectory = _configPath
            }.ToSettings();

            _engine = new ClientEngine(settings);
            await _engine.StartAllAsync();
        }
        return _engine;
    }

    #endregion

    #region Download Management

    public async Task<object> AddTorrent(string id, string magnetUri, string? name)
    {
        try
        {
            var engine = await GetEngine();

            // Parse magnet link
            var magnet = MagnetLink.Parse(magnetUri);

            // Create torrent settings
            var torrentSettings = new TorrentSettingsBuilder
            {
                CreateContainingDirectory = true,
                MaximumConnections = 60,
                MaximumDownloadRate = 0,
                MaximumUploadRate = 0,
                AllowDht = true,
                AllowPeerExchange = true
            }.ToSettings();

            // Add to engine
            var manager = await engine.AddAsync(magnet, _downloadPath, torrentSettings);

            _activeDownloads[id] = manager;

            // Setup event handlers
            manager.TorrentStateChanged += (sender, e) =>
            {
                if (e.NewState == TorrentState.Seeding || e.NewState == TorrentState.Stopped)
                {
                    if (manager.Complete)
                    {
                        _onComplete?.Invoke(id, new
                        {
                            id,
                            savePath = Path.Combine(_downloadPath, manager.Torrent?.Name ?? "download")
                        });
                    }
                }
            };

            // Start download
            await manager.StartAsync();

            // Start progress tracking
            var cts = new CancellationTokenSource();
            _progressCancellations[id] = cts;
            _ = TrackProgress(id, manager, cts.Token);

            // Save to downloads list
            SaveDownloadInfo(id, new DownloadInfo
            {
                Id = id,
                Name = name ?? magnet.Name ?? "Unknown",
                MagnetUri = magnetUri,
                Progress = 0,
                Status = "downloading",
                CreatedAt = DateTime.UtcNow,
                SavePath = _downloadPath
            });

            return new { success = true, torrentId = id };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    private async Task TrackProgress(string id, TorrentManager manager, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested && !manager.Complete)
        {
            try
            {
                await Task.Delay(1000, ct);

                var progress = manager.Progress;
                var downloadSpeed = manager.Monitor.DownloadRate;
                var uploadSpeed = manager.Monitor.UploadRate;
                var downloaded = manager.Monitor.DataBytesReceived;
                var totalSize = manager.Torrent?.Size ?? 0;
                var peers = manager.Peers.Available;

                var updates = new
                {
                    id,
                    progress = Math.Round(progress, 1),
                    downloadSpeed,
                    uploadSpeed,
                    downloaded,
                    totalSize,
                    peers,
                    status = manager.State.ToString().ToLower()
                };

                _onProgress?.Invoke(id, updates);

                // Update stored info
                UpdateDownloadProgress(id, progress, downloadSpeed, downloaded, totalSize, peers);
            }
            catch (OperationCanceledException) { break; }
            catch { /* Continue tracking */ }
        }
    }

    public async Task<object> PauseTorrent(string id)
    {
        if (_activeDownloads.TryGetValue(id, out var manager))
        {
            await manager.PauseAsync();
            UpdateDownloadStatus(id, "paused");

            if (_progressCancellations.TryGetValue(id, out var cts))
            {
                cts.Cancel();
                _progressCancellations.Remove(id);
            }

            return new { success = true };
        }
        return new { success = false, error = "Torrent not found" };
    }

    public async Task<object> ResumeTorrent(string id)
    {
        if (_activeDownloads.TryGetValue(id, out var manager))
        {
            await manager.StartAsync();
            UpdateDownloadStatus(id, "downloading");

            // Restart progress tracking
            var cts = new CancellationTokenSource();
            _progressCancellations[id] = cts;
            _ = TrackProgress(id, manager, cts.Token);

            return new { success = true };
        }
        return new { success = false, error = "Torrent not found" };
    }

    public async Task<object> CancelTorrent(string id)
    {
        // Stop progress tracking
        if (_progressCancellations.TryGetValue(id, out var cts))
        {
            cts.Cancel();
            _progressCancellations.Remove(id);
        }

        // Remove torrent
        if (_activeDownloads.TryGetValue(id, out var manager))
        {
            if (_engine != null)
            {
                await _engine.RemoveAsync(manager);
            }
            _activeDownloads.Remove(id);
        }

        // Remove from store
        RemoveDownloadInfo(id);

        return new { success = true };
    }

    public List<DownloadInfo> GetAllDownloads()
    {
        return LoadDownloads();
    }

    #endregion

    #region Storage

    public class DownloadInfo
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string MagnetUri { get; set; } = "";
        public double Progress { get; set; }
        public long DownloadSpeed { get; set; }
        public long UploadSpeed { get; set; }
        public long Downloaded { get; set; }
        public long TotalSize { get; set; }
        public string Status { get; set; } = "pending";
        public int Peers { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string SavePath { get; set; } = "";
        public string? Error { get; set; }
    }

    private string DownloadsFilePath => Path.Combine(_configPath, "downloads.json");

    private List<DownloadInfo> LoadDownloads()
    {
        try
        {
            if (File.Exists(DownloadsFilePath))
            {
                var json = File.ReadAllText(DownloadsFilePath);
                return JsonSerializer.Deserialize<List<DownloadInfo>>(json) ?? new();
            }
        }
        catch { }
        return new();
    }

    private void SaveDownloads(List<DownloadInfo> downloads)
    {
        try
        {
            var json = JsonSerializer.Serialize(downloads, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(DownloadsFilePath, json);
        }
        catch { }
    }

    private void SaveDownloadInfo(string id, DownloadInfo info)
    {
        var downloads = LoadDownloads();
        var existingIndex = downloads.FindIndex(d => d.Id == id);
        if (existingIndex >= 0)
            downloads[existingIndex] = info;
        else
            downloads.Add(info);
        SaveDownloads(downloads);
    }

    private void UpdateDownloadProgress(string id, double progress, long downloadSpeed, long downloaded, long totalSize, int peers)
    {
        var downloads = LoadDownloads();
        var index = downloads.FindIndex(d => d.Id == id);
        if (index >= 0)
        {
            downloads[index].Progress = progress;
            downloads[index].DownloadSpeed = downloadSpeed;
            downloads[index].Downloaded = downloaded;
            downloads[index].TotalSize = totalSize;
            downloads[index].Peers = peers;
            SaveDownloads(downloads);
        }
    }

    private void UpdateDownloadStatus(string id, string status)
    {
        var downloads = LoadDownloads();
        var index = downloads.FindIndex(d => d.Id == id);
        if (index >= 0)
        {
            downloads[index].Status = status;
            if (status == "completed")
                downloads[index].CompletedAt = DateTime.UtcNow;
            SaveDownloads(downloads);
        }
    }

    private void RemoveDownloadInfo(string id)
    {
        var downloads = LoadDownloads();
        downloads.RemoveAll(d => d.Id == id);
        SaveDownloads(downloads);
    }

    #endregion

    #region IDisposable

    public void Dispose()
    {
        foreach (var cts in _progressCancellations.Values)
            cts.Cancel();
        _progressCancellations.Clear();

        _activeDownloads.Clear();

        if (_engine != null)
        {
            _engine.StopAllAsync().Wait();
            _engine.Dispose();
            _engine = null;
        }
    }

    #endregion
}
