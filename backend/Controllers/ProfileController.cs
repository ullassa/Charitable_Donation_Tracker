using System.Security.Claims;
using BCrypt.Net;
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
                    City = !string.IsNullOrWhiteSpace(request.City)
                        ? request.City.Trim()
                        : !string.IsNullOrWhiteSpace(request.AddressLine)
                            ? request.AddressLine.Trim()
                            : "Unknown",
                    Gender = "Other",
                    CreatedAt = DateTime.UtcNow,
                    IsAnonymousDefault = false
                };

                _context.Customers.Add(user.Customer);
            }
            else
            {
                if (!string.IsNullOrWhiteSpace(request.City))
                {
                    user.Customer.City = request.City.Trim();
                }
                else if (!string.IsNullOrWhiteSpace(request.AddressLine))
                {
                    user.Customer.City = request.AddressLine.Trim();
                }
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
        if (request == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.CharityRegistrationRequests)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        var charity = await _context.Charities
            .FirstOrDefaultAsync(c => c.UserId == user.UserId);

        if (charity == null)
            return NotFound(new { success = false, message = "Charity profile not found." });

        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { success = false, message = "Name is required." });

        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { success = false, message = "Email is required." });

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            return BadRequest(new { success = false, message = "Phone number is required." });

        var newEmail = request.Email.Trim().ToLowerInvariant();
        var emailInUse = await _context.Users.AnyAsync(u => u.Email == newEmail && u.UserId != user.UserId);
        if (emailInUse)
            return BadRequest(new { success = false, message = "Email already exists." });

        user.UserName = request.Name.Trim();
        user.Email = newEmail;
        user.PhoneNumber = request.PhoneNumber.Trim();

        charity.AddressLine = request.AddressLine?.Trim() ?? charity.AddressLine;
        charity.City = request.City?.Trim() ?? charity.City;
        charity.Mission = request.Mission?.Trim() ?? charity.Mission;
        charity.About = request.About?.Trim() ?? charity.About;
        charity.Activities = request.Activities?.Trim() ?? charity.Activities;
        charity.SocialMediaLink = request.SocialMediaLink?.Trim() ?? charity.SocialMediaLink;
        charity.CauseType = request.CauseType;

        await _context.SaveChangesAsync();

        await _notifications.NotifyUserAsync(
            user,
            "Profile updated",
            "Your charity profile has been updated successfully on CareFund.");

        await _auditLogs.LogAsync(
            user.UserId,
            user.UserRole,
            "Update",
            "CharityRegistrationRequest",
            charity.CharityRegistrationId,
            $"Charity profile updated for {user.UserName}.");

        return Ok(new
        {
            success = true,
            message = "Charity profile updated successfully."
        });
    }

    [HttpPut("disable")]
    [Authorize]
    public async Task<IActionResult> DisableOwnAccount([FromBody] DisableAccountRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { success = false, message = "Password is required." });

        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        // Verify password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        bool passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!passwordValid)
            return Unauthorized(new { success = false, message = "Invalid password." });

        // Check if already disabled
        if (!user.IsActive)
            return BadRequest(new { success = false, message = "Account is already disabled." });

        // Disable account
        user.IsActive = false;
        await _context.SaveChangesAsync();

        // Log audit
        await _auditLogs.LogAsync(
            user.UserId,
            user.UserRole,
            "Disable",
            "User",
            user.UserId,
            $"User {user.UserName} disabled their own account.");

        // Send notification
        await _notifications.NotifyUserAsync(
            user,
            "Account Disabled",
            "Your CareFund account has been disabled. To re-enable it, please contact support at support@carefund.com with your email and reason for reactivation.");

        return Ok(new
        {
            success = true,
            message = "Account disabled successfully. To re-enable your account, please contact admin."
        });
    }

    [HttpPut("delete")]
    [Authorize]
    public async Task<IActionResult> DeleteOwnAccount([FromBody] DeleteAccountRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new { success = false, message = "Password is required." });

        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.Customer)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        // Verify password
        bool passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        if (!passwordValid)
            return Unauthorized(new { success = false, message = "Invalid password." });

        // Log audit before deletion
        await _auditLogs.LogAsync(
            user.UserId,
            user.UserRole,
            "Delete",
            "User",
            user.UserId,
            $"User {user.UserName} deleted their own account permanently.");

        // Delete related records via Customer FK if customer exists
        if (user.Customer != null)
        {
            var donations = await _context.Donations.Where(d => d.CustomerId == user.Customer.CustomerId).ToListAsync();
            if (donations.Any())
                _context.Donations.RemoveRange(donations);

            var favorites = await _context.FavoriteCharities.Where(f => f.CustomerId == user.Customer.CustomerId).ToListAsync();
            if (favorites.Any())
                _context.FavoriteCharities.RemoveRange(favorites);

            _context.Customers.Remove(user.Customer);
        }

        // Delete user
        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            message = "Account deleted permanently. Your email is now available for reuse."
        });
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

public class DisableAccountRequest
{
    public string Password { get; set; } = string.Empty;
}

public class DeleteAccountRequest
{
    public string Password { get; set; } = string.Empty;
}
