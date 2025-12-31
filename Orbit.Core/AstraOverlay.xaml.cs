using System;
using System.Windows;
using System.Windows.Input;
using Orbit.Core.Services;
using Media = System.Windows.Media;

namespace Orbit.Core;

/// <summary>
/// Astra Overlay Window - Transparent HUD that shows live League of Legends stats.
/// Uses official Riot APIs (LCU + Live Game API) - completely safe and legal.
/// Visibility: Only shown when IN GAME + TAB key is held.
/// </summary>
public partial class AstraOverlay : Window
{
    private readonly LeagueDetectionService _leagueService;
    private readonly KeyboardHook _keyboardHook;

    private bool _isInGame;
    private bool _isTabHeld;

    public LeagueDetectionService LeagueService => _leagueService;
    public bool IsServiceRunning { get; private set; }

    public AstraOverlay()
    {
        InitializeComponent();

        _leagueService = new LeagueDetectionService();
        _keyboardHook = new KeyboardHook();

        // Subscribe to League events
        _leagueService.ClientConnected += OnClientConnected;
        _leagueService.ClientDisconnected += OnClientDisconnected;
        _leagueService.GameStateChanged += OnGameStateChanged;
        _leagueService.LiveDataUpdated += OnLiveDataUpdated;

        // Subscribe to keyboard events
        _keyboardHook.KeyDown += OnKeyDown;
        _keyboardHook.KeyUp += OnKeyUp;

        // Start hidden - will show only when in game + TAB held
        this.Visibility = Visibility.Hidden;
    }

    /// <summary>
    /// Start the overlay service (called from MainWindow IPC)
    /// </summary>
    public void StartService()
    {
        if (IsServiceRunning) return;

        IsServiceRunning = true;
        _leagueService.StartMonitoring(2000);
        _keyboardHook.Start();

        // Show briefly to indicate service started, then hide
        this.Visibility = Visibility.Visible;
        UpdateStatus("Service started. Searching for League...");

        // Hide after 2 seconds if not in game
        var timer = new System.Windows.Threading.DispatcherTimer();
        timer.Interval = TimeSpan.FromSeconds(2);
        timer.Tick += (s, e) =>
        {
            timer.Stop();
            if (!_isInGame || !_isTabHeld)
            {
                this.Visibility = Visibility.Hidden;
            }
        };
        timer.Start();
    }

    /// <summary>
    /// Stop the overlay service
    /// </summary>
    public void StopService()
    {
        IsServiceRunning = false;
        _leagueService.StopMonitoring();
        _keyboardHook.Stop();
        this.Visibility = Visibility.Hidden;
    }

    private void OnKeyDown(object? sender, Key key)
    {
        if (key == Key.Tab && !_isTabHeld)
        {
            _isTabHeld = true;
            UpdateOverlayVisibility();
        }
    }

    private void OnKeyUp(object? sender, Key key)
    {
        if (key == Key.Tab)
        {
            _isTabHeld = false;
            UpdateOverlayVisibility();
        }
    }

    private void UpdateOverlayVisibility()
    {
        Dispatcher.Invoke(() =>
        {
            // Show overlay only when: In Game + TAB is held
            if (_isInGame && _isTabHeld)
            {
                this.Visibility = Visibility.Visible;
                this.Topmost = true; // Ensure it's on top
            }
            else
            {
                this.Visibility = Visibility.Hidden;
            }
        });
    }

    private void OnClientConnected(object? sender, LeagueClientInfo info)
    {
        Dispatcher.Invoke(() =>
        {

            ConnectionDot.Fill = new Media.SolidColorBrush(Media.Color.FromRgb(34, 197, 94)); // Green
            ConnectionStatus.Text = $"Connected (Port {info.Port})";
            StatusIndicator.Text = " • CONNECTED";
            StatusIndicator.Foreground = new Media.SolidColorBrush(Media.Color.FromRgb(34, 197, 94));
            WaitingPanel.Visibility = Visibility.Visible;
        });
    }

    private void OnClientDisconnected(object? sender, EventArgs e)
    {
        Dispatcher.Invoke(() =>
        {

            _isInGame = false;
            ConnectionDot.Fill = new Media.SolidColorBrush(Media.Color.FromRgb(239, 68, 68)); // Red
            ConnectionStatus.Text = "Not Detected";
            StatusIndicator.Text = " • DETECTING";
            StatusIndicator.Foreground = new Media.SolidColorBrush(Media.Color.FromRgb(245, 158, 11));

            GameStatsPanel.Visibility = Visibility.Collapsed;
            WaitingPanel.Visibility = Visibility.Collapsed;

            UpdateOverlayVisibility();
        });
    }

    private void OnGameStateChanged(object? sender, GameState state)
    {
        Dispatcher.Invoke(() =>
        {
            _isInGame = state.IsInGame;

            if (state.IsInGame)
            {
                StatusIndicator.Text = " • IN GAME";
                StatusIndicator.Foreground = new Media.SolidColorBrush(Media.Color.FromRgb(0, 212, 255));
                GameStatsPanel.Visibility = Visibility.Visible;
                WaitingPanel.Visibility = Visibility.Collapsed;
            }
            else
            {
                StatusIndicator.Text = " • CONNECTED";
                StatusIndicator.Foreground = new Media.SolidColorBrush(Media.Color.FromRgb(34, 197, 94));
                GameStatsPanel.Visibility = Visibility.Collapsed;
                WaitingPanel.Visibility = Visibility.Visible;
                ResetStats();
            }

            UpdateOverlayVisibility();
        });
    }

    private void OnLiveDataUpdated(object? sender, LiveGameData data)
    {
        Dispatcher.Invoke(() =>
        {
            // Update summoner info
            ChampionName.Text = data.ChampionName;
            SummonerName.Text = data.SummonerName;
            LevelText.Text = data.Level.ToString();

            // Update KDA
            KillsText.Text = data.Kills.ToString();
            DeathsText.Text = data.Deaths.ToString();
            AssistsText.Text = data.Assists.ToString();

            var kda = (data.Kills + data.Assists) / Math.Max(data.Deaths, 1.0);
            KdaRatio.Text = $"{kda:F2} KDA";

            // Update CS
            CsText.Text = data.CreepScore.ToString();
            CsPerMinText.Text = $"{data.CsPerMin:F1} /min";

            // Update Vision
            VisionText.Text = data.VisionScore.ToString();

            // Update Game Time
            var minutes = (int)(data.GameTime / 60);
            var seconds = (int)(data.GameTime % 60);
            GameTimeText.Text = $"{minutes:D2}:{seconds:D2}";
        });
    }

    private void ResetStats()
    {
        ChampionName.Text = "Champion";
        SummonerName.Text = "Summoner";
        LevelText.Text = "1";
        KillsText.Text = "0";
        DeathsText.Text = "0";
        AssistsText.Text = "0";
        KdaRatio.Text = "0.00 KDA";
        CsText.Text = "0";
        CsPerMinText.Text = "0.0 /min";
        VisionText.Text = "0";
        GameTimeText.Text = "00:00";
    }

    private void UpdateStatus(string message)
    {
        Dispatcher.Invoke(() =>
        {
            ConnectionStatus.Text = message;
        });
    }

    private void Window_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
    {
        // Allow dragging the window
        if (e.LeftButton == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void CloseButton_Click(object sender, RoutedEventArgs e)
    {
        StopService();
        Close();
    }

    protected override void OnClosed(EventArgs e)
    {
        StopService();
        _leagueService.Dispose();
        _keyboardHook.Dispose();
        base.OnClosed(e);
    }
}
