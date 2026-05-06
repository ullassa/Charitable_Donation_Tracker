using System.Security.Claims;
using System.Text;
using CareFund.Data;
using CareFund.DTOs.Payments;
using CareFund.Enums;
using CareFund.Models;
using CareFund.Services.AuditLogs;
using CareFund.Services.Notifications;
using CareFund.Services.Payments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Controllers;

[ApiController]
[Route("api/donations")]
[Authorize]
public class DonationsController : ControllerBase
{
    private const decimal CharitySufficientAmountThreshold = 100000m;
    private readonly ApplicationDbContext _context;
    private readonly INotificationEmailService _notifications;
    private readonly IAuditLogService _auditLogs;

    public DonationsController(ApplicationDbContext context, INotificationEmailService notifications, IAuditLogService auditLogs)
    {
        _context = context;
        _notifications = notifications;
        _auditLogs = auditLogs;
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateDonation([FromBody] CreateDonationRequest request)
    {
        if (request == null || request.CharityRegistrationId <= 0 || request.Amount <= 0)
            return BadRequest(new { success = false, message = "Valid charity and donation amount are required." });

        var user = await GetCurrentCustomerUserAsync();
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        if (user.UserRole != UserRole.Customer)
            return Forbid();

        var customer = await EnsureCustomerAsync(user);

        var charity = await _context.Charities.Include(c => c.User)
            .FirstOrDefaultAsync(c => c.CharityRegistrationId == request.CharityRegistrationId && c.Status == CharityStatus.Approved);

        if (charity == null)
            return NotFound(new { success = false, message = "Approved charity not found." });

        var payment = new Payment
        {
            PaymentMethod = request.PaymentMethod,
            TransactionReference = string.IsNullOrWhiteSpace(request.TransactionReference)
                ? $"CF-{DateTime.UtcNow:yyyyMMddHHmmssfff}"
                : request.TransactionReference,
            TransactionId = request.TransactionReference,
            Amount = request.Amount,
            Currency = "INR",
            Status = "Completed",
            GatewayName = request.PaymentMethod.ToString(),
            PaymentDate = DateTime.UtcNow
        };

        var donation = await CreateDonationRecordsAsync(customer, charity, request.Amount, request.IsAnonymous, payment);
        await NotifyDonationAsync(user, charity, donation, payment);

        return Ok(new
        {
            success = true,
            donationId = donation.DonationId,
            paymentReference = payment.TransactionReference,
            message = "Donation completed successfully."
        });
    }

    private async Task<User?> GetCurrentCustomerUserAsync()
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return null;

        var normalized = email.Trim().ToLowerInvariant();
        return await _context.Users
            .Include(u => u.Customer)
            .FirstOrDefaultAsync(u => u.Email == normalized);
    }

    private async Task<Customer> EnsureCustomerAsync(User user)
    {
        if (user.Customer != null)
            return user.Customer;

        var customer = new Customer
        {
            UserId = user.UserId,
            DateOfBirth = DateTime.UtcNow,
            City = "Unknown",
            Gender = "Other",
            CreatedAt = DateTime.UtcNow,
            IsAnonymousDefault = false
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();
        user.Customer = customer;
        return customer;
    }

    private async Task<Donation> CreateDonationRecordsAsync(Customer customer, CharityRegistrationRequest charity, decimal amount, bool isAnonymous, Payment payment)
    {
        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        var donation = new Donation
        {
            CustomerId = customer.CustomerId,
            CharityRegistrationId = charity.CharityRegistrationId,
            Amount = amount,
            DonationDate = DateTime.UtcNow,
            IsAnonymous = isAnonymous,
            PaymentId = payment.PaymentId
        };

        _context.Donations.Add(donation);
        await _context.SaveChangesAsync();
        return donation;
    }

    private async Task NotifyDonationAsync(User user, CharityRegistrationRequest charity, Donation donation, Payment payment)
    {
        await _auditLogs.LogAsync(
            user.UserId,
            user.UserRole,
            "Donation",
            "Donation",
            donation.DonationId,
            $"Customer donated ₹{donation.Amount:n2} to Charity ID {charity.CharityRegistrationId}.");

        var donorMessage = $"You donated ₹{donation.Amount:n2} to {charity.User?.UserName ?? "a charity"} on CareFund. Transaction reference: {payment.TransactionReference}.";
        await _notifications.NotifyUserAsync(user, "Donation received", donorMessage, donation.DonationId);

        var totalCollected = await _context.Donations
            .Where(d => d.CharityRegistrationId == charity.CharityRegistrationId)
            .SumAsync(d => (decimal?)d.Amount) ?? 0;

        await _notifications.NotifyUserAsync(charity.User!, "New donation received", $"Your charity received a donation of ₹{donation.Amount:n2} from a CareFund donor. Total collected so far is ₹{totalCollected:n2}.", donation.DonationId);

        if (totalCollected >= CharitySufficientAmountThreshold)
        {
            await _notifications.NotifyUserAsync(charity.User!, "Fundraising milestone reached", $"Your charity has reached the CareFund fundraising milestone with ₹{totalCollected:n2} collected.", donation.DonationId);
        }
    }

    [HttpGet("{donationId:int}/receipt")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> DownloadReceipt(int donationId)
    {
        return await DownloadReceiptInternal(donationId);
    }

    [HttpGet("/api/donation/receipt/{donationId:int}")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> DownloadReceiptBySingularRoute(int donationId)
    {
        return await DownloadReceiptInternal(donationId);
    }

    private async Task<IActionResult> DownloadReceiptInternal(int donationId)
    {
        var email = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(email))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var normalized = email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.Customer)
            .FirstOrDefaultAsync(u => u.Email == normalized && u.UserRole == UserRole.Customer);

        if (user?.Customer == null)
            return NotFound(new { success = false, message = "Customer profile not found." });

        var donation = await _context.Donations
            .AsNoTracking()
            .Include(d => d.Payment)
            .Include(d => d.CharityRegistrationRequest)
                .ThenInclude(c => c!.User)
            .FirstOrDefaultAsync(d => d.DonationId == donationId && d.CustomerId == user.Customer.CustomerId);

        if (donation == null)
            return NotFound(new { success = false, message = "Donation not found." });

        var pdf = BuildDonationReceiptPdf(
            user.UserName,
            user.Email,
            donation.CharityRegistrationRequest?.User?.UserName ?? "CareFund Charity",
            donation.DonationId,
            donation.DonationDate,
            donation.Amount,
            donation.Payment?.PaymentMethod.ToString() ?? "N/A",
            donation.Payment?.TransactionReference,
            donation.IsAnonymous);

        return File(pdf, "application/pdf", $"Donation_Receipt_{donation.DonationId}.pdf");
    }

    private static byte[] BuildDonationReceiptPdf(
        string donorName,
        string donorEmail,
        string charityName,
        int donationId,
        DateTime donationDate,
        decimal amount,
        string paymentMethod,
        string? transactionReference,
        bool isAnonymous)
    {
        var lines = new List<string>
        {
            "Receipt Summary",
            $"Donation ID: {donationId}",
            $"Receipt Date: {DateTime.UtcNow:yyyy-MM-dd HH:mm}",
            $"Donation Date: {donationDate:yyyy-MM-dd HH:mm}",
            $"Customer Name: {donorName}",
            $"Customer Email: {donorEmail}",
            $"Charity Name: {charityName}",
            $"Amount: INR {amount:n2}",
            $"Payment Method: {paymentMethod}",
            $"Transaction Ref: {transactionReference ?? "N/A"}",
            $"Anonymous Donation: {(isAnonymous ? "Yes" : "No")}",
            string.Empty,
            "This receipt confirms your donation on CareFund.",
            "Thank you for your generosity and support.",
            "Giving is not just about making a donation, it is about making a difference.",
            string.Empty,
            "Authorized by CareFund"
        };

        return BuildSimplePdf("CareFund Donation Receipt", "Donation Receipt", lines);
    }

    private static byte[] BuildSimplePdf(string title, string subtitle, IEnumerable<string> lines)
    {
        var safeTitle = PdfEscape(title);
        var safeSubtitle = PdfEscape(subtitle);
        var content = new StringBuilder();

        content.AppendLine("BT");
        content.AppendLine("/F1 18 Tf");
        content.AppendLine("0.10 0.20 0.45 rg");
        content.AppendLine("1 0 0 1 40 770 Tm");
        content.AppendLine($"({safeTitle}) Tj");
        content.AppendLine("/F1 12 Tf");
        content.AppendLine("0.20 0.30 0.50 rg");
        content.AppendLine("1 0 0 1 40 748 Tm");
        content.AppendLine($"({safeSubtitle}) Tj");
        content.AppendLine("/F1 10 Tf");
        content.AppendLine("0 0 0 rg");

        var y = 720;
        foreach (var line in lines.Take(45))
        {
            content.AppendLine($"1 0 0 1 40 {y} Tm");
            content.AppendLine($"({PdfEscape(line)}) Tj");
            y -= 14;
        }

        content.AppendLine("/F1 8 Tf");
        content.AppendLine("0.35 0.35 0.35 rg");
        content.AppendLine("1 0 0 1 40 42 Tm");
        content.AppendLine($"(Generated on {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC by CareFund) Tj");
        content.AppendLine("ET");

        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());
        var objects = new List<string>
        {
            "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
            "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
            "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            $"5 0 obj\n<< /Length {contentBytes.Length} >>\nstream\n{content}endstream\nendobj\n"
        };

        var pdf = new StringBuilder();
        pdf.Append("%PDF-1.4\n");

        var offsets = new List<int> { 0 };
        foreach (var obj in objects)
        {
            offsets.Add(Encoding.ASCII.GetByteCount(pdf.ToString()));
            pdf.Append(obj);
        }

        var xrefStart = Encoding.ASCII.GetByteCount(pdf.ToString());
        pdf.Append($"xref\n0 {objects.Count + 1}\n");
        pdf.Append("0000000000 65535 f \n");

        for (var i = 1; i <= objects.Count; i++)
        {
            pdf.Append($"{offsets[i]:D10} 00000 n \n");
        }

        pdf.Append("trailer\n");
        pdf.Append($"<< /Size {objects.Count + 1} /Root 1 0 R >>\n");
        pdf.Append("startxref\n");
        pdf.Append($"{xrefStart}\n");
        pdf.Append("%%EOF");

        return Encoding.ASCII.GetBytes(pdf.ToString());
    }

    private static string PdfEscape(string value)
    {
        return (value ?? string.Empty)
            .Replace("\\", "\\\\")
            .Replace("(", "\\(")
            .Replace(")", "\\)");
    }
}

public class CreateDonationRequest
{
    public int CharityRegistrationId { get; set; }
    public decimal Amount { get; set; }
    public bool IsAnonymous { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.UPI;
    public string? TransactionReference { get; set; }
}
