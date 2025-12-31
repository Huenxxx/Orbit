using Microsoft.AspNetCore.Mvc;

namespace Orbit.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StatusController : ControllerBase
{
    [HttpGet]
    public IActionResult GetStatus()
    {
        return Ok(new { 
            Status = "Online", 
            Server = "Orbit Server", 
            Version = "1.0.0", 
            Time = DateTime.UtcNow 
        });
    }
}
