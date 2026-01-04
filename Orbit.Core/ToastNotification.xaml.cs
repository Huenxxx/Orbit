using System;
using System.Windows;
using System.Windows.Threading;

namespace Orbit.Core
{
    public partial class ToastNotification : Window
    {
        public ToastNotification(string title, string message)
        {
            InitializeComponent();
            TitleText.Text = title;
            MessageText.Text = message;

            // Position bottom-right
            var desktopWorkingArea = SystemParameters.WorkArea;
            this.Left = desktopWorkingArea.Right - this.Width - 20;
            this.Top = desktopWorkingArea.Bottom - this.Height - 20;

            // Fade out timer
            var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(5) };
            timer.Tick += (s, e) =>
            {
                timer.Stop();
                var sb = (System.Windows.Media.Animation.Storyboard)this.FindResource("FadeOut");
                sb.Completed += (s2, e2) => this.Close();
                sb.Begin();
            };
            timer.Start();
        }

        public static void Show(string title, string message)
        {
            System.Windows.Application.Current.Dispatcher.Invoke(() =>
            {
                var toast = new ToastNotification(title, message);
                toast.Show();
            });
        }
    }
}
