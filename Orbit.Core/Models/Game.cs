using System;
using System.Collections.Generic;

namespace Orbit.Core.Models
{
    public class Game
    {
        public string id { get; set; } = "";
        public string title { get; set; } = "";
        public string description { get; set; } = "";
        public string coverImage { get; set; } = "";
        public string? backgroundImage { get; set; }
        public List<string>? screenshots { get; set; }
        public string? trailerUrl { get; set; }
        public string? executablePath { get; set; }
        public string? installPath { get; set; }
        public string platform { get; set; } = "custom";
        public List<string> genres { get; set; } = new List<string>();
        public string developer { get; set; } = "";
        public string? publisher { get; set; }
        public string? releaseDate { get; set; }
        public double? rating { get; set; }
        public int? metacriticScore { get; set; }
        public int playtime { get; set; }
        public string? lastPlayed { get; set; }
        public string dateAdded { get; set; } = "";
        public string status { get; set; } = "not_started";
        public List<string> tags { get; set; } = new List<string>();
        public bool isFavorite { get; set; }
        public List<object>? achievements { get; set; }
        public bool isInstalled { get; set; }
        public string? size { get; set; }
        
        // RAWG Integration
        public int? rawgId { get; set; }
        public string? rawgSlug { get; set; }
        public bool? autoMatched { get; set; }
        public string? originalTitle { get; set; }
    }
}
