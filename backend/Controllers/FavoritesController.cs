using System.Security.Claims;
using CareFund.Data;
using CareFund.Enums;
using CareFund.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize(Roles = "Customer")]
public class FavoritesController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public FavoritesController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine()
    {
        var customer = await ResolveCustomerAsync();
        if (customer == null)
            return NotFound(new { success = false, message = "Customer profile not found." });

        var items = await _context.FavoriteCharities
            .AsNoTracking()
            .Where(f => f.CustomerId == customer.CustomerId)
            .Select(f => f.CharityRegistrationId)
            .ToListAsync();

        return Ok(new { success = true, items });
    }

    [HttpPost("{charityId:int}")]
    public async Task<IActionResult> AddFavorite(int charityId)
    {
        if (charityId <= 0)
            return BadRequest(new { success = false, message = "Valid charity id is required." });

        var customer = await ResolveCustomerAsync();
        if (customer == null)
            return NotFound(new { success = false, message = "Customer profile not found." });

        var charityExists = await _context.Charities
            .AsNoTracking()
            .AnyAsync(c => c.CharityRegistrationId == charityId && c.Status == CharityStatus.Approved && c.IsActive);

        if (!charityExists)
            return NotFound(new { success = false, message = "Charity not found." });

        var exists = await _context.FavoriteCharities
            .AnyAsync(f => f.CustomerId == customer.CustomerId && f.CharityRegistrationId == charityId);

        if (!exists)
        {
            _context.FavoriteCharities.Add(new FavoriteCharity
            {
                CustomerId = customer.CustomerId,
                CharityRegistrationId = charityId,
                CreatedAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true, message = "Charity added to favorites." });
    }

    [HttpDelete("{charityId:int}")]
    public async Task<IActionResult> RemoveFavorite(int charityId)
    {
        var customer = await ResolveCustomerAsync();
        if (customer == null)
            return NotFound(new { success = false, message = "Customer profile not found." });

        var item = await _context.FavoriteCharities
            .FirstOrDefaultAsync(f => f.CustomerId == customer.CustomerId && f.CharityRegistrationId == charityId);

        if (item != null)
        {
            _context.FavoriteCharities.Remove(item);
            await _context.SaveChangesAsync();
        }

        return Ok(new { success = true, message = "Charity removed from favorites." });
    }

    private async Task<Customer?> ResolveCustomerAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return null;

        var normalized = email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalized && u.UserRole == UserRole.Customer);

        if (user == null)
            return null;

        return await _context.Customers
            .FirstOrDefaultAsync(c => c.UserId == user.UserId);
    }
}
