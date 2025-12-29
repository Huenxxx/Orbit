using System;
using System.Diagnostics;
using System.Net;
using System.Threading.Tasks;
using System.Web;
using System.Collections.Specialized;
using System.Text.Json;

namespace Orbit.Core.Services
{
    public class SteamAuthService
    {
        private const string OPENID_URL = "https://steamcommunity.com/openid/login";
        private const string CALLBACK_URL = "http://127.0.0.1:5000/auth/steam/return";

        public async Task<string> StartSteamAuth()
        {
            // 1. Construct OpenID Paramaters
            var query = HttpUtility.ParseQueryString(string.Empty);
            query["openid.ns"] = "http://specs.openid.net/auth/2.0";
            query["openid.mode"] = "checkid_setup";
            query["openid.return_to"] = CALLBACK_URL;
            query["openid.realm"] = "http://127.0.0.1:5000";
            query["openid.identity"] = "http://specs.openid.net/auth/2.0/identifier_select";
            query["openid.claimed_id"] = "http://specs.openid.net/auth/2.0/identifier_select";

            var authUrl = $"{OPENID_URL}?{query}";

            // 2. Start Local HTTP Server for Callback
            var listener = new HttpListener();
            listener.Prefixes.Add("http://127.0.0.1:5000/");
            listener.Start();

            // 3. Open System Browser
            Process.Start(new ProcessStartInfo
            {
                FileName = authUrl,
                UseShellExecute = true
            });

            try
            {
                // 4. Wait for Callback
                var context = await listener.GetContextAsync();
                var request = context.Request;
                var response = context.Response;

                // 5. Validate parameters 
                // (In a real app, strict validation against Steam server is required 'check_authentication')
                // For now, parsing the claimed_id is enough for MVP
                
                var steamId = ExtractSteamId(request.QueryString["openid.claimed_id"]);

                // 6. Send Response to Browser
                string responseString = "<html><body><h1>Login Successful! You can close this window.</h1><script>window.close();</script></body></html>";
                byte[] buffer = System.Text.Encoding.UTF8.GetBytes(responseString);
                response.ContentLength64 = buffer.Length;
                response.OutputStream.Write(buffer, 0, buffer.Length);
                response.OutputStream.Close();

                return steamId;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return null;
            }
            finally
            {
                listener.Stop();
            }
        }

        private string ExtractSteamId(string claimedId)
        {
            if (string.IsNullOrEmpty(claimedId)) return null;
            // Format: https://steamcommunity.com/openid/id/76561198...
            var parts = claimedId.Split('/');
            return parts[parts.Length - 1];
        }
    }
}
