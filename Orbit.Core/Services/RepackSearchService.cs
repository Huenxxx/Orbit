using System.Net;
using System.Net.Http;
using System.Text.RegularExpressions;

namespace Orbit.Core.Services;

/// <summary>
/// Repack search service - searches FitGirl, DODI, and ElAmigos
/// </summary>
public class RepackSearchService
{
    private static readonly HttpClient _httpClient = new(new HttpClientHandler
    {
        AllowAutoRedirect = true,
        MaxAutomaticRedirections = 5
    })
    {
        Timeout = TimeSpan.FromSeconds(15)
    };

    private const string USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

    #region Models

    public class RepackResult
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
        public string PostUrl { get; set; } = "";
        public string Size { get; set; } = "Desconocido";
        public string Source { get; set; } = "";
        public string? MagnetUri { get; set; }
    }

    #endregion

    #region HTTP Helpers

    private async Task<string> FetchPage(string url, int retries = 2)
    {
        for (int i = 0; i <= retries; i++)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("User-Agent", USER_AGENT);
                request.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
                request.Headers.Add("Accept-Language", "en-US,en;q=0.9,es;q=0.8");

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync();
                }
            }
            catch
            {
                if (i == retries) return "";
                await Task.Delay(1000);
            }
        }
        return "";
    }

    #endregion

    #region FitGirl Repacks

    private async Task<List<RepackResult>> SearchFitGirl(string query)
    {
        var results = new List<RepackResult>();

        try
        {
            var searchUrl = $"https://fitgirl-repacks.site/?s={Uri.EscapeDataString(query)}";
            var html = await FetchPage(searchUrl);
            if (string.IsNullOrEmpty(html)) return results;

            // Match article entries
            var articleRegex = new Regex(
                @"<article[^>]*>[\s\S]*?<h1[^>]*class=""entry-title""[^>]*>[\s\S]*?<a[^>]*href=""([^""]+)""[^>]*>([^<]+)</a>[\s\S]*?</article>",
                RegexOptions.IgnoreCase
            );

            var matches = articleRegex.Matches(html);

            foreach (Match match in matches.Take(10))
            {
                var postUrl = match.Groups[1].Value;
                var title = WebUtility.HtmlDecode(match.Groups[2].Value.Trim());

                // Skip non-game posts
                if (title.Contains("site update", StringComparison.OrdinalIgnoreCase) ||
                    title.Contains("weekly", StringComparison.OrdinalIgnoreCase) ||
                    !postUrl.Contains("fitgirl-repacks.site"))
                    continue;

                // Try to extract size
                var sizeMatch = Regex.Match(match.Value, @"(?:Repack Size|Size)[:\s]*([^<\n]+)", RegexOptions.IgnoreCase);
                if (!sizeMatch.Success)
                    sizeMatch = Regex.Match(match.Value, @"(\d+(?:\.\d+)?\s*(?:GB|MB))", RegexOptions.IgnoreCase);
                var size = sizeMatch.Success ? sizeMatch.Groups[1].Value.Trim() : "Desconocido";

                results.Add(new RepackResult
                {
                    Id = $"fitgirl_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{results.Count}",
                    Name = title,
                    PostUrl = postUrl,
                    Size = size,
                    Source = "FitGirl"
                });
            }
        }
        catch { }

        return results;
    }

    private async Task<string?> ExtractFitGirlMagnet(string postUrl)
    {
        try
        {
            var html = await FetchPage(postUrl);
            if (string.IsNullOrEmpty(html)) return null;

            var magnetRegex = new Regex(@"magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^""'\s<]*", RegexOptions.IgnoreCase);
            var match = magnetRegex.Match(html);

            if (match.Success)
            {
                return match.Value.Replace("&amp;", "&");
            }
        }
        catch { }

        return null;
    }

    #endregion

    #region DODI Repacks

    private async Task<List<RepackResult>> SearchDODI(string query)
    {
        var results = new List<RepackResult>();

        try
        {
            var searchUrl = $"https://dodi-repacks.site/?s={Uri.EscapeDataString(query)}";
            var html = await FetchPage(searchUrl);
            if (string.IsNullOrEmpty(html)) return results;

            var articleRegex = new Regex(
                @"<article[^>]*>[\s\S]*?<h2[^>]*class=""[^""]*entry-title[^""]*""[^>]*>[\s\S]*?<a[^>]*href=""([^""]+)""[^>]*>([^<]+)</a>[\s\S]*?</article>",
                RegexOptions.IgnoreCase
            );

            var matches = articleRegex.Matches(html);

            foreach (Match match in matches.Take(10))
            {
                var postUrl = match.Groups[1].Value;
                var title = WebUtility.HtmlDecode(match.Groups[2].Value.Trim());

                if (!postUrl.Contains("dodi-repacks")) continue;

                results.Add(new RepackResult
                {
                    Id = $"dodi_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{results.Count}",
                    Name = title,
                    PostUrl = postUrl,
                    Source = "DODI"
                });
            }
        }
        catch { }

        return results;
    }

    private async Task<string?> ExtractDODIMagnet(string postUrl)
    {
        try
        {
            var html = await FetchPage(postUrl);
            if (string.IsNullOrEmpty(html)) return null;

            var magnetRegex = new Regex(@"magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^""'\s<]*", RegexOptions.IgnoreCase);
            var match = magnetRegex.Match(html);

            if (match.Success)
            {
                return match.Value.Replace("&amp;", "&");
            }
        }
        catch { }

        return null;
    }

    #endregion

    #region ElAmigos

    private async Task<List<RepackResult>> SearchElAmigos(string query)
    {
        var results = new List<RepackResult>();

        try
        {
            var searchUrl = $"https://elamigos.site/?s={Uri.EscapeDataString(query)}";
            var html = await FetchPage(searchUrl);
            if (string.IsNullOrEmpty(html)) return results;

            var entryRegex = new Regex(
                @"<h2[^>]*class=""[^""]*entry-title[^""]*""[^>]*>[\s\S]*?<a[^>]*href=""([^""]+)""[^>]*>([^<]+)</a>",
                RegexOptions.IgnoreCase
            );

            var matches = entryRegex.Matches(html);

            foreach (Match match in matches.Take(10))
            {
                var postUrl = match.Groups[1].Value;
                var title = WebUtility.HtmlDecode(match.Groups[2].Value.Trim());

                results.Add(new RepackResult
                {
                    Id = $"elamigos_{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}_{results.Count}",
                    Name = title,
                    PostUrl = postUrl,
                    Source = "ElAmigos"
                });
            }
        }
        catch { }

        return results;
    }

    private async Task<string?> ExtractElAmigosMagnet(string postUrl)
    {
        try
        {
            var html = await FetchPage(postUrl);
            if (string.IsNullOrEmpty(html)) return null;

            var magnetRegex = new Regex(@"magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^""'\s<]*", RegexOptions.IgnoreCase);
            var match = magnetRegex.Match(html);

            if (match.Success)
            {
                return match.Value.Replace("&amp;", "&");
            }
        }
        catch { }

        return null;
    }

    #endregion

    #region Public API

    public async Task<List<RepackResult>> SearchRepacks(string query)
    {
        var combined = new List<RepackResult>();
        const int maxPerSource = 5;

        try
        {
            var tasks = new[]
            {
                SearchFitGirl(query),
                SearchDODI(query),
                SearchElAmigos(query)
            };

            var results = await Task.WhenAll(tasks);

            // FitGirl results
            if (results[0] != null)
                combined.AddRange(results[0].Take(maxPerSource));

            // DODI results
            if (results[1] != null)
                combined.AddRange(results[1].Take(maxPerSource));

            // ElAmigos results
            if (results[2] != null)
                combined.AddRange(results[2].Take(maxPerSource));
        }
        catch { }

        return combined;
    }

    public async Task<object> GetMagnetLink(string source, string postUrl)
    {
        try
        {
            string? magnet = null;

            var sourceLower = source.ToLower();

            if (sourceLower.Contains("fitgirl"))
                magnet = await ExtractFitGirlMagnet(postUrl);
            else if (sourceLower.Contains("dodi"))
                magnet = await ExtractDODIMagnet(postUrl);
            else if (sourceLower.Contains("elamigos") || sourceLower.Contains("amigos"))
                magnet = await ExtractElAmigosMagnet(postUrl);
            else
            {
                // Generic: try to find magnet on the page
                var html = await FetchPage(postUrl);
                if (!string.IsNullOrEmpty(html))
                {
                    var magnetRegex = new Regex(@"magnet:\?xt=urn:btih:[a-zA-Z0-9]+[^""'\s<]*", RegexOptions.IgnoreCase);
                    var match = magnetRegex.Match(html);
                    if (match.Success)
                        magnet = match.Value.Replace("&amp;", "&");
                }
            }

            if (!string.IsNullOrEmpty(magnet) && magnet.StartsWith("magnet:"))
            {
                return new { success = true, magnet };
            }

            return new { success = false, error = "No se encontró enlace magnet" };
        }
        catch (Exception ex)
        {
            return new { success = false, error = ex.Message };
        }
    }

    #endregion
}
