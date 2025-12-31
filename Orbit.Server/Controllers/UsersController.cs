using Microsoft.AspNetCore.Mvc;
using Orbit.Shared.Models;

namespace Orbit.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    // Mock database for now
    private static readonly List<UserProfile> _users = new();

    [HttpGet("{id}")]
    public ActionResult<UserProfile> GetUser(Guid id)
    {
        var user = _users.FirstOrDefault(u => u.Id == id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost]
    public ActionResult<UserProfile> CreateUser([FromBody] UserProfile user)
    {
        user.Id = Guid.NewGuid();
        user.CreatedAt = DateTime.UtcNow;
        _users.Add(user);
        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, user);
    }
}
