using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Orbit.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Requires valid Firebase Token
public class MeController : ControllerBase
{
    [HttpGet]
    public IActionResult GetMyProfile()
    {
        // Extract info from Claims (populated by FirebaseAuthHandler)
        var uid = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var email = User.FindFirst(ClaimTypes.Email)?.Value;

        return Ok(new
        {
            Message = "You are authenticated with Firebase!",
            FirebaseUid = uid,
            Email = email,
            ServerTime = DateTime.UtcNow
        });
    }
}
