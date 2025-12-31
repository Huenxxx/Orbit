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

        public async Task<string?> StartSteamAuth()
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
                string responseString = @"
<!DOCTYPE html>
<html lang='es'>
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <title>Orbit - Conexión Exitosa</title>
    <style>
        body {
            background-color: #0f172a; /* Slate 900 */
            color: #e2e8f0; /* Slate 200 */
            font-family: 'Segoe UI', system-ui, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }
        .card {
            background: #1e293b; /* Slate 800 */
            padding: 2rem 3rem;
            border-radius: 1rem;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
            text-align: center;
            max-width: 400px;
            width: 100%;
            border: 1px solid #334155;
        }
        h1 {
            color: #fff;
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
        }
        p {
            color: #94a3b8;
            margin-bottom: 2rem;
        }
        .icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }
        .icon svg {
            width: 40px;
            height: 40px;
            color: white;
            stroke-width: 3;
        }
        .btn {
            background: #334155;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .btn:hover {
            background: #475569;
        }
    </style>
</head>
<body>
    <div class='card'>
        <div class='icon'>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path stroke-linecap='round' stroke-linejoin='round' d='M4.5 12.75l6 6 9-13.5' />
            </svg>
        </div>
        <h1>¡Conectado con Steam!</h1>
        <p>Tu cuenta se ha vinculado correctamente. Ya puedes cerrar esta ventana y volver a Orbit.</p>
        <button class='btn' onclick='window.close()'>Cerrar ventana</button>
    </div>
    <script>
        // Try to auto-close after 3 seconds
        setTimeout(() => {
            window.close();
        }, 3000);
    </script>
</body>
</html>";
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

        private string? ExtractSteamId(string? claimedId)
        {
            if (string.IsNullOrEmpty(claimedId)) return null;
            // Format: https://steamcommunity.com/openid/id/76561198...
            var parts = claimedId.Split('/');
            return parts[parts.Length - 1];
        }
    }
}
