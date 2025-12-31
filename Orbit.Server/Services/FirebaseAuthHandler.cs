using System.Security.Claims;
using System.Text.Encodings.Web;
using FirebaseAdmin.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Options;

namespace Orbit.Server.Services;

public class FirebaseAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public FirebaseAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue("Authorization", out var authHeader))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authHeader.ToString();
        if (token.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = token.Substring("Bearer ".Length).Trim();
        }
        else
        {
             return AuthenticateResult.Fail("Invalid Authorization header format.");
        }

        try
        {
            // Verify ID Token with Firebase
            var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(token);
            
            // Build Claims Principal
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, decodedToken.Uid),
                new Claim(ClaimTypes.Email, decodedToken.Claims.ContainsKey("email") ? decodedToken.Claims["email"].ToString()! : "")
            };

            var identity = new ClaimsIdentity(claims, nameof(FirebaseAuthHandler));
            var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
        catch (Exception ex)
        {
            return AuthenticateResult.Fail($"Token verification failed: {ex.Message}");
        }
    }
}
