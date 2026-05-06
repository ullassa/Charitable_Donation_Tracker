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
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationEmailService _notifications;
    private readonly IAuditLogService _auditLogs;

    public AdminController(ApplicationDbContext context, INotificationEmailService notifications, IAuditLogService auditLogs)
    {
        _context = context;
        _notifications = notifications;
        _auditLogs = auditLogs;
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var pending = await _context.Charities.CountAsync(c => c.Status == CharityStatus.Pending);
        var approved = await _context.Charities.CountAsync(c => c.Status == CharityStatus.Approved);
        var rejected = await _context.Charities.CountAsync(c => c.Status == CharityStatus.Rejected);
        var hold = await _context.Charities.CountAsync(c => c.Status == CharityStatus.Hold);
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
            bankName = c.BankName,
            accountHolderName = c.AccountHolderName,
            accountNumber = c.AccountNumber,
            ifscCode = c.IFSCCode,
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
                hold,
                totalCustomers = customers,
                totalCharities = charities,
                totalDonors,
                totalDonation
            },
            recentRequests = mappedRecentRequests,
            customers = customersList
        });
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] int months = 6)
    {
        var safeMonths = Math.Clamp(months, 3, 24);
        var start = DateTime.UtcNow.Date.AddMonths(-(safeMonths - 1));

        var monthlyRaw = await _context.Donations
            .AsNoTracking()
            .Where(d => d.DonationDate >= start)
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                amount = g.Sum(x => x.Amount),
                count = g.Count()
            })
            .ToListAsync();

        var monthlyMap = monthlyRaw.ToDictionary(x => (x.Year, x.Month), x => x);
        var monthly = Enumerable.Range(0, safeMonths)
            .Select(i => start.AddMonths(i))
            .Select(dt =>
            {
                var key = (dt.Year, dt.Month);
                if (monthlyMap.TryGetValue(key, out var found))
                {
                    return new
                    {
                        label = dt.ToString("yyyy-MM"),
                        amount = found.amount,
                        count = found.count
                    };
                }

                return new
                {
                    label = dt.ToString("yyyy-MM"),
                    amount = 0m,
                    count = 0
                };
            })
            .ToList();

        var causeBreakdown = await _context.Donations
            .AsNoTracking()
            .Include(d => d.CharityRegistrationRequest)
            .Where(d => d.DonationDate >= start)
            .GroupBy(d => d.CharityRegistrationRequest != null ? d.CharityRegistrationRequest.CauseType.ToString() : "Unknown")
            .Select(g => new
            {
                cause = g.Key,
                amount = g.Sum(x => x.Amount),
                count = g.Count()
            })
            .OrderByDescending(x => x.amount)
            .Take(8)
            .ToListAsync();

        return Ok(new
        {
            success = true,
            period = new { from = start, to = DateTime.UtcNow },
            monthly,
            causes = causeBreakdown
        });
    }

    [HttpGet("donors")]
    public async Task<IActionResult> GetDonors([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
    {
        var query = _context.Donations
            .AsNoTracking()
            .Include(d => d.Customer)
                .ThenInclude(c => c!.User)
            .Include(d => d.Payment)
            .Include(d => d.CharityRegistrationRequest)
                .ThenInclude(c => c!.User)
            .AsQueryable();

        if (from.HasValue)
        {
            query = query.Where(d => d.DonationDate >= from.Value);
        }

        if (to.HasValue)
        {
            var inclusiveTo = to.Value.Date.AddDays(1).AddTicks(-1);
            query = query.Where(d => d.DonationDate <= inclusiveTo);
        }

        var donations = await query
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
                    isAnonymous = x.IsAnonymous,
                    paymentMethod = x.Payment != null ? x.Payment.PaymentMethod.ToString() : string.Empty,
                    transactionReference = x.Payment?.TransactionReference,
                    donorName = x.IsAnonymous
                        ? "Anonymous"
                        : (customer?.User?.UserName ?? "Unknown donor"),
                    donorEmail = x.IsAnonymous
                        ? "Hidden"
                        : (customer?.User?.Email ?? string.Empty),
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

    [HttpGet("feedbacks")]
    public async Task<IActionResult> GetFeedbacks()
    {
        var items = await _context.Feedbacks
            .AsNoTracking()
            .Include(f => f.User)
            .OrderByDescending(f => f.CreatedAt)
            .Take(200)
            .Select(f => new
            {
                feedbackId = f.FeedbackId,
                userId = f.UserId,
                donorName = f.User != null ? f.User.UserName : "Unknown",
                donorEmail = f.User != null ? f.User.Email : string.Empty,
                donationId = f.DonationId,
                charityName = f.CharityName,
                amount = f.Amount,
                paymentMethod = f.PaymentMethod,
                paymentReference = f.PaymentReference,
                rating = f.Rating,
                experience = f.Experience,
                suggestion = f.Suggestion,
                createdAt = f.CreatedAt
            })
            .ToListAsync();

        return Ok(new { success = true, items });
    }

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs()
    {
        var items = await (from log in _context.AuditLogs.AsNoTracking()
                           join user in _context.Users.AsNoTracking()
                               on log.UserId equals user.UserId into userJoin
                           from user in userJoin.DefaultIfEmpty()
                           orderby log.Timestamp descending
                           select new
                           {
                               log.Id,
                               time = log.Timestamp,
                               log.UserId,
                               userName = user != null ? user.UserName : "System",
                               role = string.IsNullOrWhiteSpace(log.UserRole) ? "Unknown" : log.UserRole,
                               action = log.Action,
                               entity = log.EntityName,
                               log.EntityId,
                               details = log.Details
                           })
                           .ToListAsync();

        return Ok(new { success = true, items });
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
            bankName = c.BankName,
            accountHolderName = c.AccountHolderName,
            accountNumber = c.AccountNumber,
            ifscCode = c.IFSCCode,
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
        if (action != "approve" && action != "reject" && action != "hold")
            return BadRequest(new { success = false, message = "Action must be approve, reject or hold." });

        entity.Status = action switch
        {
            "approve" => CharityStatus.Approved,
            "reject" => CharityStatus.Rejected,
            "hold" => CharityStatus.Hold,
            _ => entity.Status
        };
        entity.AdminComment = dto.AdminComment;
        entity.ReviewedAt = DateTime.UtcNow;

        var adminEmail = User.FindFirstValue(ClaimTypes.Email);
        var adminUser = await _context.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == (adminEmail ?? string.Empty).Trim().ToLowerInvariant());

        var auditAction = action == "approve"
            ? "Approve"
            : action == "reject"
                ? "Reject"
                : "Update";

        await _auditLogs.LogAsync(
            adminUser?.UserId,
            adminUser?.UserRole ?? UserRole.Admin,
            auditAction,
            "Charity",
            entity.CharityRegistrationId,
            $"Charity request {action}d for {entity.User?.UserName ?? "CareFund"}." +
            (string.IsNullOrWhiteSpace(dto.AdminComment) ? string.Empty : $" Comment: {dto.AdminComment}"));

        await _notifications.NotifyUserAsync(
            entity.User!,
            action == "approve"
                ? "Charity application approved"
                : action == "hold"
                    ? "Charity application put on hold"
                    : "Charity application rejected",
            action == "approve"
                ? $"Your charity registration for {entity.User?.UserName ?? "CareFund"} has been approved by admin. You can now continue using the platform as an approved charity."
                : action == "hold"
                    ? $"Your charity account is on hold. Please contact carefund03@gmail.com for further clarification. Comment: {dto.AdminComment ?? "No comment provided."}"
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
