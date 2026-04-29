using System.Security.Claims;
using CareFund.Data;
using CareFund.Enums;
using CareFund.Models;
using CareFund.Services.AuditLogs;
using CareFund.Services.Notifications;
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
    private readonly INotificationEmailService _notifications;
    private readonly IAuditLogService _auditLogs;

    public ProfileController(ApplicationDbContext context, INotificationEmailService notifications, IAuditLogService auditLogs)
    {
        _context = context;
        _notifications = notifications;
        _auditLogs = auditLogs;
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
                user.AddressLine,
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
                charity.IndianState,
                charity.Pincode,
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

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Name is required." });

        user.UserName = request.Name.Trim();

        if (user.UserRole == UserRole.Admin)
        {
            var newEmail = (request.Email ?? string.Empty).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(newEmail) || string.IsNullOrWhiteSpace(request.PhoneNumber))
                return BadRequest(new { success = false, message = "Email and phone are required for admin profile update." });

            var emailInUse = await _context.Users.AnyAsync(u => u.Email == newEmail && u.UserId != user.UserId);
            if (emailInUse)
                return BadRequest(new { success = false, message = "Email already exists." });

            user.Email = newEmail;
            user.PhoneNumber = request.PhoneNumber.Trim();
        }

        if (user.UserRole == UserRole.Customer)
        {
            if (user.Customer == null)
            {
                user.Customer = new Customer
                {
                    UserId = user.UserId,
                    DateOfBirth = DateTime.UtcNow,
                    City = string.IsNullOrWhiteSpace(request.AddressLine) ? "Unknown" : request.AddressLine.Trim(),
                    Gender = "Other",
                    CreatedAt = DateTime.UtcNow,
                    IsAnonymousDefault = false
                };

                _context.Customers.Add(user.Customer);
            }
            else
            {
                user.Customer.City = string.IsNullOrWhiteSpace(request.AddressLine) ? user.Customer.City : request.AddressLine.Trim();
            }
        }

        await _context.SaveChangesAsync();

        await _notifications.NotifyUserAsync(
            user,
            "Profile updated",
            user.UserRole == UserRole.Admin
                ? "Your admin profile has been updated successfully on CareFund."
                : "Your customer profile has been updated successfully on CareFund.");

        await _auditLogs.LogAsync(
            user.UserId,
            user.UserRole,
            "Update",
            "User",
            user.UserId,
            $"Profile updated for {user.UserName}.");

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
        return Forbid();
    }
}

public class UpdateCustomerProfileRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? AddressLine { get; set; }
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
