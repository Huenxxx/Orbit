using System.Configuration;
using System.Data;

namespace Orbit.Core;

/// <summary>
/// Interaction logic for App.xaml
/// </summary>
public partial class App : System.Windows.Application
{
    protected override void OnStartup(System.Windows.StartupEventArgs e)
    {
        try
        {
            base.OnStartup(e);
            // Initialize main window but do not show it
            // It will set up the system tray icon in its constructor
            var mainWindow = new MainWindow();
            mainWindow.Show(); // Start visible
        }
        catch (Exception ex)
        {
            System.Windows.MessageBox.Show($"Error al iniciar Orbit:\n{ex.Message}\n\n{ex.StackTrace}", "Orbit Crash", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Error);
            System.IO.File.WriteAllText("crash_startup.txt", ex.ToString());
            Shutdown();
        }
    }
}
