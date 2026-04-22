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
        var totalDonors = await _context.Donations.Select(d => d.CustomerId).Distinct().CountAsync();
        var totalDonation = await _context.Donations.SumAsync(d => (decimal?)d.Amount) ?? 0;

        var recentRequests = await _context.Charities
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.Donations)
            .OrderByDescending(c => c.SubmittedAt)
            .Take(10)
            .ToListAsync();

        var customersList = await _context.Users
            .AsNoTracking()
            .Where(u => u.UserRole == UserRole.Customer && u.IsActive)
            .Select(u => new
            {
                userId = u.UserId,
                name = u.UserName,
                email = u.Email,
                phone = u.PhoneNumber,
                city = u.Customer != null ? u.Customer.City : string.Empty,
                donationsCount = u.Customer != null ? u.Customer.Donations.Count : 0,
                totalDonated = u.Customer != null ? u.Customer.Donations.Sum(d => d.Amount) : 0
            })
            .OrderByDescending(c => c.totalDonated)
            .ToListAsync();

        var mappedRecentRequests = recentRequests.Select(c => new
        {
            charityRegistrationId = c.CharityRegistrationId,
            charityName = c.User != null ? c.User.UserName : string.Empty,
            email = c.User != null ? c.User.Email : string.Empty,
            userPhone = c.User != null ? c.User.PhoneNumber : string.Empty,
            managerName = c.ManagerName,
            managerPhone = c.ManagerPhone,
            registrationId = c.RegistrationId,
            cause = c.CauseType.ToString(),
            mission = c.Mission,
            about = c.About,
            activities = c.Activities,
            targetAmount = c.TargetAmount,
            totalReceived = c.Donations != null ? c.Donations.Sum(d => d.Amount) : 0,
            remainingAmount = Math.Max(0, c.TargetAmount - (c.Donations != null ? c.Donations.Sum(d => d.Amount) : 0)),
            addressLine = c.AddressLine,
            city = c.City,
            state = c.IndianState.ToString(),
            pincode = c.Pincode,
            socialMediaLink = c.SocialMediaLink,
            status = c.Status.ToString(),
            submittedAt = c.SubmittedAt,
            reviewedAt = c.ReviewedAt,
            adminComment = c.AdminComment
        }).ToList();

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
                totalDonors,
                totalDonation
            },
            recentRequests = mappedRecentRequests,
            customers = customersList
        });
    }

    [HttpGet("donors")]
    public async Task<IActionResult> GetDonors()
    {
        var donations = await _context.Donations
            .AsNoTracking()
            .Include(d => d.Customer)
                .ThenInclude(c => c!.User)
            .Include(d => d.Payment)
            .Include(d => d.CharityRegistrationRequest)
                .ThenInclude(c => c!.User)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();

        var donors = donations
            .GroupBy(d => d.CustomerId)
            .Select(g =>
        {
            var firstDonation = g.First();
            var customer = firstDonation.Customer;

            return new
            {
                donorId = g.Key,
                name = customer?.User?.UserName ?? "Anonymous donor",
                email = customer?.User?.Email ?? string.Empty,
                phone = customer?.User?.PhoneNumber ?? string.Empty,
                city = customer?.City ?? string.Empty,
                createdAt = customer?.CreatedAt,
                donationsCount = g.Count(),
                totalDonated = g.Sum(x => x.Amount),
                lastDonationAt = g.Max(x => x.DonationDate),
                donations = g.Select(x => new
                {
                    donationId = x.DonationId,
                    amount = x.Amount,
                    donationDate = x.DonationDate,
                    paymentMethod = x.Payment != null ? x.Payment.PaymentMethod.ToString() : string.Empty,
                    transactionReference = x.Payment?.TransactionReference,
                    charityName = x.CharityRegistrationRequest?.User != null
                        ? x.CharityRegistrationRequest.User.UserName
                        : x.CharityRegistrationRequest != null ? x.CharityRegistrationRequest.ManagerName : string.Empty,
                    charityRegistrationId = x.CharityRegistrationId
                }).ToList()
            };
        })
        .Where(d => d.donationsCount > 0)
        .OrderByDescending(d => d.totalDonated)
        .ToList();

        return Ok(new { success = true, items = donors });
    }

    [HttpGet("charity-requests")]
    public async Task<IActionResult> GetCharityRequests([FromQuery] string? status = null)
    {
        var query = _context.Charities
            .AsNoTracking()
            .Include(c => c.User)
            .Include(c => c.Donations)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<CharityStatus>(status, true, out var parsedStatus))
        {
            query = query.Where(c => c.Status == parsedStatus);
        }

        var charities = await query
            .OrderByDescending(c => c.SubmittedAt)
            .ToListAsync();

        var items = charities.Select(c => new
        {
            charityRegistrationId = c.CharityRegistrationId,
            charityName = c.User != null ? c.User.UserName : string.Empty,
            email = c.User != null ? c.User.Email : string.Empty,
            userPhone = c.User != null ? c.User.PhoneNumber : string.Empty,
            managerName = c.ManagerName,
            managerPhone = c.ManagerPhone,
            registrationId = c.RegistrationId,
            cause = c.CauseType.ToString(),
            mission = c.Mission,
            about = c.About,
            activities = c.Activities,
            targetAmount = c.TargetAmount,
            totalReceived = c.Donations != null ? c.Donations.Sum(d => d.Amount) : 0,
            remainingAmount = Math.Max(0, c.TargetAmount - (c.Donations != null ? c.Donations.Sum(d => d.Amount) : 0)),
            addressLine = c.AddressLine,
            city = c.City,
            state = c.IndianState.ToString(),
            pincode = c.Pincode,
            socialMediaLink = c.SocialMediaLink,
            status = c.Status.ToString(),
            submittedAt = c.SubmittedAt,
            reviewedAt = c.ReviewedAt,
            adminComment = c.AdminComment
        }).ToList();

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
