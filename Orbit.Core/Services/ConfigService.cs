using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace Orbit.Core.Services
{
    public class ConfigService
    {
        private string _configPath;
        private Dictionary<string, object> _config = new Dictionary<string, object>();

        public ConfigService()
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            _configPath = Path.Combine(appData, "Orbit", "config.json");
            
            // Ensure directory exists
            var dir = Path.GetDirectoryName(_configPath);
            if (dir != null && !Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            LoadConfig();
        }

        private void LoadConfig()
        {
            try
            {
                if (File.Exists(_configPath))
                {
                    var json = File.ReadAllText(_configPath);
                    _config = JsonSerializer.Deserialize<Dictionary<string, object>>(json) ?? new Dictionary<string, object>();
                }
                else
                {
                    _config = new Dictionary<string, object>();
                }
            }
            catch
            {
                _config = new Dictionary<string, object>();
            }
        }

        public void Set(string key, object value)
        {
            _config[key] = value;
            SaveConfig();
        }

        public T Get<T>(string key)
        {
            if (_config.TryGetValue(key, out var value))
            {
                // JsonElement handling because System.Text.Json deserializes to JsonElement by default for object
                if (value is JsonElement element)
                {
                    return element.Deserialize<T>();
                }
                return (T)value; // Basic cast attempt
            }
            return default(T);
        }

        private void SaveConfig()
        {
            try
            {
                var options = new JsonSerializerOptions { WriteIndented = true };
                var json = JsonSerializer.Serialize(_config, options);
                File.WriteAllText(_configPath, json);
            }
            catch (Exception ex)
            {
                // Handle save error
                System.Diagnostics.Debug.WriteLine($"Error saving config: {ex.Message}");
            }
        }
    }
}
