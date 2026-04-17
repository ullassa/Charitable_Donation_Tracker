using System.Security.Claims;
using CareFund.Data;
using CareFund.Enums;
using CareFund.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ProfileController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Customer)
            .FirstOrDefaultAsync(u => u.Email == email.Trim().ToLowerInvariant());

        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        var charity = await _context.Charities
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == user.UserId);

        return Ok(new
        {
            success = true,
            role = user.UserRole.ToString(),
            user = new
            {
                user.UserId,
                user.UserName,
                user.Email,
                user.PhoneNumber,
                role = user.UserRole.ToString(),
                user.Customer?.City,
                user.Customer?.DateOfBirth
            },
            customer = user.Customer == null ? null : new
            {
                user.Customer.CustomerId,
                user.Customer.City,
                user.Customer.DateOfBirth,
                user.Customer.Gender,
                user.Customer.IsAnonymousDefault
            },
            charity = charity == null ? null : new
            {
                charity.CharityRegistrationId,
                charity.RegistrationId,
                charity.Mission,
                charity.About,
                charity.Activities,
                charity.AddressLine,
                charity.City,
                charity.ManagerName,
                charity.ManagerPhone,
                charity.SocialMediaLink,
                charity.CauseType,
                charity.Status,
                charity.AdminComment,
                charity.ReviewedAt
            }
        });
    }

    [HttpPut("customer")]
    [Authorize(Roles = "Customer,Admin")]
    public async Task<IActionResult> UpdateCustomer([FromBody] UpdateCustomerProfileRequest request)
    {
        if (request == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        var newEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(newEmail) || string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(new { success = false, message = "Name, email and phone are required." });

        var emailInUse = await _context.Users.AnyAsync(u => u.Email == newEmail && u.UserId != user.UserId);
        if (emailInUse)
            return BadRequest(new { success = false, message = "Email already exists." });

        user.UserName = request.Name.Trim();
        user.Email = newEmail;
        user.PhoneNumber = request.PhoneNumber.Trim();

        if (user.UserRole == UserRole.Customer)
        {
            if (user.Customer == null)
            {
                user.Customer = new Customer
                {
                    UserId = user.UserId,
                    DateOfBirth = DateTime.UtcNow,
                    City = string.IsNullOrWhiteSpace(request.City) ? "Unknown" : request.City.Trim(),
                    Gender = "Other",
                    CreatedAt = DateTime.UtcNow,
                    IsAnonymousDefault = false
                };

                _context.Customers.Add(user.Customer);
            }
            else
            {
                user.Customer.City = string.IsNullOrWhiteSpace(request.City) ? user.Customer.City : request.City.Trim();
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = user.UserRole == UserRole.Admin
                ? "Admin profile updated successfully."
                : "Customer profile updated successfully."
        });
    }

    [HttpPut("charity")]
    [Authorize(Roles = "CharityManager")]
    public async Task<IActionResult> UpdateCharity([FromBody] UpdateCharityProfileRequest request)
    {
        if (request == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        var charity = await _context.Charities.FirstOrDefaultAsync(c => c.UserId == user.UserId);
        if (charity == null)
            return NotFound(new { success = false, message = "Charity profile not found." });

        var newEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(newEmail) || string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(new { success = false, message = "Name, email and phone are required." });

        var emailInUse = await _context.Users.AnyAsync(u => u.Email == newEmail && u.UserId != user.UserId);
        if (emailInUse)
            return BadRequest(new { success = false, message = "Email already exists." });

        user.UserName = request.Name.Trim();
        user.Email = newEmail;
        user.PhoneNumber = request.PhoneNumber.Trim();

        charity.Mission = request.Mission?.Trim() ?? charity.Mission;
        charity.About = request.About?.Trim() ?? charity.About;
        charity.Activities = request.Activities?.Trim() ?? charity.Activities;
        charity.AddressLine = request.AddressLine?.Trim() ?? charity.AddressLine;
        charity.City = request.City?.Trim() ?? charity.City;
        charity.ManagerName = request.Name.Trim();
        charity.ManagerPhone = request.PhoneNumber.Trim();
        charity.SocialMediaLink = request.SocialMediaLink?.Trim() ?? charity.SocialMediaLink;
        charity.CauseType = request.CauseType;
        charity.Status = CharityStatus.Pending;
        charity.ReviewedAt = null;
        charity.AdminComment = "Profile update submitted for admin approval.";
        charity.IsActive = true;

        var admins = await _context.Users.Where(u => u.UserRole == UserRole.Admin && u.IsActive).ToListAsync();
        foreach (var admin in admins)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = admin.UserId,
                NotificationType = NotificationType.Email,
                Message = $"Charity profile update submitted by {user.UserName}. Approval is required."
            });
        }

        _context.Notifications.Add(new Notification
        {
            UserId = user.UserId,
            NotificationType = NotificationType.Email,
            Message = "Your charity profile update was submitted and is pending admin approval."
        });

        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Charity profile update submitted for admin approval." });
    }
}

public class UpdateCustomerProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? City { get; set; }
}

public class UpdateCharityProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? AddressLine { get; set; }
    public string? Mission { get; set; }
    public string? About { get; set; }
    public string? Activities { get; set; }
    public string? SocialMediaLink { get; set; }
    public CauseType CauseType { get; set; }
}
