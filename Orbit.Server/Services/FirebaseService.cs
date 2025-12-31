using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;

namespace Orbit.Server.Services;

public static class FirebaseService
{
    public static void Initialize(IConfiguration configuration)
    {
        // Check if already initialized
        if (FirebaseApp.DefaultInstance != null) return;

        var projectId = configuration["Firebase:ProjectId"];
        var credentialPath = configuration["Firebase:CredentialPath"];
        
        // Resolve absolute path if local
        if (!string.IsNullOrEmpty(credentialPath) && !Path.IsPathRooted(credentialPath))
        {
            credentialPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, credentialPath);
        }

        try 
        {
            GoogleCredential credential;

            if (!string.IsNullOrEmpty(credentialPath) && File.Exists(credentialPath))
            {
                credential = GoogleCredential.FromFile(credentialPath);
                Console.WriteLine($"Loading Firebase credentials from: {credentialPath}");
            }
            else
            {
                // Fallback (Will fail if no env var set)
                Console.WriteLine("Warning: No service account file found. Trying Application Default Credentials...");
                credential = GoogleCredential.GetApplicationDefault();
            }

            var options = new AppOptions
            {
                ProjectId = projectId,
                Credential = credential
            };

            FirebaseApp.Create(options);
            Console.WriteLine("Firebase Admin SDK initialized successfully.");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error initializing Firebase: {ex.Message}");
            // Non-blocking catch to allow server to start for status checks
        }
    }
}
