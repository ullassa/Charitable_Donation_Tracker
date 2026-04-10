using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using CareFund.Data;
using CareFund.Models;
using System.Linq;
 
namespace CareFund.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
 
        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }
 
        // GET: api/users
        [Authorize]
        [HttpGet]
        public IActionResult GetUsers()
        {
            var users = _context.Users.ToList();
            return Ok(users);
        }
        

        // POST: api/users
        [Authorize]
        [HttpPost("login")]
        public async Task<IActionResult> CreateUser( User user)
        {
            if (user == null)
                return BadRequest();
 
            _context.Users.Add(user);
          await _context.SaveChangesAsync();
 
            return Ok(user);
        }
        [HttpPut("{id}")]
public async Task<IActionResult> UpdateUser(int id, User updatedUser)
{
    if (id != updatedUser.UserId)
        return BadRequest("ID mismatch");

    var user = await _context.Users.FindAsync(id);

    if (user == null)
        return NotFound("User not found");

    // Update fields
    user.UserName = updatedUser.UserName;
    user.Email = updatedUser.Email;
    user.PhoneNumber = updatedUser.PhoneNumber;
    user.PasswordHash = updatedUser.PasswordHash;
    user.UserRole = updatedUser.UserRole;

    await _context.SaveChangesAsync();

    return Ok(user);
}

[HttpDelete("{id}")]
public async Task<IActionResult> DeleteUser(int id)
{
    var user = await _context.Users.FindAsync(id);

    if (user == null)
        return NotFound("User not found");

    _context.Users.Remove(user);
    await _context.SaveChangesAsync();

    return Ok("User deleted successfully");
}
    }
}
 