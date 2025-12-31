using System.ComponentModel.DataAnnotations;

namespace Orbit.Shared.Models;

public class AuthRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    public string? Username { get; set; } // Optional for Login
}

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public UserProfile? User { get; set; }
}
