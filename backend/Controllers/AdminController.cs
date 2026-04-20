using System.Security.Claims;
using CareFund.Data;
using CareFund.Enums;
using CareFund.Models;
using CareFund.Services.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationEmailService _notifications;

    public AdminController(ApplicationDbContext context, INotificationEmailService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var pending = await _context.Charities.CountAsync(c => c.Status == CharityStatus.Pending);
        var approved = await _context.Charities.CountAsync(c => c.Status == CharityStatus.Approved);
        var rejected = await _context.Charities.CountAsync(c => c.Status == CharityStatus.Rejected);
        var customers = await _context.Users.CountAsync(u => u.UserRole == UserRole.Customer && u.IsActive);
        var charities = await _context.Users.CountAsync(u => u.UserRole == UserRole.CharityManager && u.IsActive);
        var totalDonation = await _context.Donations.SumAsync(d => (decimal?)d.Amount) ?? 0;

        var recentRequests = await _context.Charities
            .AsNoTracking()
            .Include(c => c.User)
            .OrderByDescending(c => c.SubmittedAt)
            .Take(10)
            .Select(c => new
            {
                charityRegistrationId = c.CharityRegistrationId,
                charityName = c.User != null ? c.User.UserName : string.Empty,
                registrationId = c.RegistrationId,
                cause = c.CauseType.ToString(),
                city = c.City,
                status = c.Status.ToString(),
                submittedAt = c.SubmittedAt,
                reviewedAt = c.ReviewedAt,
                adminComment = c.AdminComment
            })
            .ToListAsync();

        return Ok(new
        {
            success = true,
            stats = new
            {
                pending,
                approved,
                rejected,
                totalCustomers = customers,
                totalCharities = charities,
                totalDonation
            },
            recentRequests
        });
    }

    [HttpGet("charity-requests")]
    public async Task<IActionResult> GetCharityRequests([FromQuery] string? status = null)
    {
        var query = _context.Charities.AsNoTracking().Include(c => c.User).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<CharityStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(c => c.Status == parsedStatus);
        }

        var items = await query
            .OrderByDescending(c => c.SubmittedAt)
            .Select(c => new
            {
                charityRegistrationId = c.CharityRegistrationId,
                charityName = c.User != null ? c.User.UserName : string.Empty,
                email = c.User != null ? c.User.Email : string.Empty,
                managerPhone = c.ManagerPhone,
                registrationId = c.RegistrationId,
                cause = c.CauseType.ToString(),
                mission = c.Mission,
                city = c.City,
                status = c.Status.ToString(),
                submittedAt = c.SubmittedAt,
                reviewedAt = c.ReviewedAt,
                adminComment = c.AdminComment
            })
            .ToListAsync();

        return Ok(new { success = true, items });
    }

    [HttpPut("charity-requests/{id}/review")]
    public async Task<IActionResult> ReviewCharityRequest(int id, [FromBody] ReviewCharityRequest dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Action))
            return BadRequest(new { success = false, message = "Action is required." });

        var entity = await _context.Charities.Include(c => c.User).FirstOrDefaultAsync(c => c.CharityRegistrationId == id);
        if (entity == null)
            return NotFound(new { success = false, message = "Charity request not found." });

        var action = dto.Action.Trim().ToLowerInvariant();
        if (action != "approve" && action != "reject")
            return BadRequest(new { success = false, message = "Action must be approve or reject." });

        entity.Status = action == "approve" ? CharityStatus.Approved : CharityStatus.Rejected;
        entity.AdminComment = dto.AdminComment;
        entity.ReviewedAt = DateTime.UtcNow;

        await _notifications.NotifyUserAsync(
            entity.User!,
            action == "approve" ? "Charity application approved" : "Charity application rejected",
            action == "approve"
                ? $"Your charity registration for {entity.User?.UserName ?? "CareFund"} has been approved by admin. You can now continue using the platform as an approved charity."
                : $"Your charity registration for {entity.User?.UserName ?? "CareFund"} has been rejected by admin. Comment: {dto.AdminComment ?? "No comment provided."}"
        );

        return Ok(new { success = true, message = $"Charity request {action}d successfully." });
    }
}

public class ReviewCharityRequest
{
    public string Action { get; set; } = string.Empty;
    public string? AdminComment { get; set; }
}
