using System.Security.Claims;
using System.Text;
using CareFund.Data;
using CareFund.Enums;
using CareFund.Models;
using CareFund.Services.Notifications;
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

    public DonationsController(ApplicationDbContext context, INotificationEmailService notifications)
    {
        _context = context;
        _notifications = notifications;
    }

    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateDonation([FromBody] CreateDonationRequest request)
    {
        if (request == null || request.CharityRegistrationId <= 0 || request.Amount <= 0)
            return BadRequest(new { success = false, message = "Valid charity and donation amount are required." });

        var email = User.FindFirstValue(ClaimTypes.Email);
        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        if (user.UserRole != UserRole.Customer)
            return Forbid();

        if (user.Customer == null)
        {
            user.Customer = new Customer
            {
                UserId = user.UserId,
                DateOfBirth = DateTime.UtcNow,
                City = "Unknown",
                Gender = "Other",
                CreatedAt = DateTime.UtcNow,
                IsAnonymousDefault = false
            };

            _context.Customers.Add(user.Customer);
            await _context.SaveChangesAsync();
        }

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
            PaymentDate = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        var donation = new Donation
        {
            CustomerId = user.Customer.CustomerId,
            CharityRegistrationId = charity.CharityRegistrationId,
            Amount = request.Amount,
            DonationDate = DateTime.UtcNow,
            IsAnonymous = request.IsAnonymous,
            PaymentId = payment.PaymentId
        };

        _context.Donations.Add(donation);
        await _context.SaveChangesAsync();

        var receiptFileName = $"Donation_Receipt_{donation.DonationId}.pdf";
        var receiptPdf = BuildDonationReceiptPdf(
            user.UserName,
            user.Email,
            charity.User?.UserName ?? "CareFund Charity",
            donation.DonationId,
            donation.DonationDate,
            donation.Amount,
            payment.PaymentMethod.ToString(),
            payment.TransactionReference,
            donation.IsAnonymous);

        var donorMessage = $"You donated ₹{request.Amount:n2} to {charity.User?.UserName ?? "a charity"} on CareFund. Transaction reference: {payment.TransactionReference}.";
        await _notifications.NotifyUserWithAttachmentAsync(
            user,
            "Donation received",
            donorMessage,
            receiptPdf,
            receiptFileName,
            donation.DonationId);

        var totalCollected = await _context.Donations
            .Where(d => d.CharityRegistrationId == charity.CharityRegistrationId)
            .SumAsync(d => (decimal?)d.Amount) ?? 0;

        await _notifications.NotifyUserAsync(charity.User!, "New donation received", $"Your charity received a donation of ₹{request.Amount:n2} from a CareFund donor. Total collected so far is ₹{totalCollected:n2}.", donation.DonationId);

        if (totalCollected >= CharitySufficientAmountThreshold)
        {
            await _notifications.NotifyUserAsync(charity.User!, "Fundraising milestone reached", $"Your charity has reached the CareFund fundraising milestone with ₹{totalCollected:n2} collected.", donation.DonationId);
        }

        return Ok(new
        {
            success = true,
            donationId = donation.DonationId,
            paymentReference = payment.TransactionReference,
            message = "Donation completed successfully."
        });
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
            "",
            $"Receipt Date: {DateTime.UtcNow:yyyy-MM-dd HH:mm}",
            $"Donation Date: {donationDate:yyyy-MM-dd HH:mm}",
            $"Donation ID: {donationId}",
            $"Transaction Ref: {transactionReference ?? "N/A"}",
            "",
            "Donor Details",
            $"Name: {donorName}",
            $"Email: {donorEmail}",
            "",
            "Charity Details",
            $"Charity: {charityName}",
            "",
            "Payment Summary",
            $"Amount: INR {amount:n2}",
            $"Payment Method: {paymentMethod}",
            $"Anonymous Donation: {(isAnonymous ? "Yes" : "No")}",
            "",
            "This receipt confirms your donation on CareFund.",
            "Thank you for your generosity and support."
        };

        return BuildSimplePdf("CareFund Donation Receipt", lines);
    }

    private static byte[] BuildSimplePdf(string title, IEnumerable<string> lines)
    {
        var safeTitle = PdfEscape(title);
        var y = 760;
        var content = new StringBuilder();
        content.AppendLine("q");
        content.AppendLine("0.10 0.45 0.85 rg");
        content.AppendLine("0 742 612 50 re f");
        content.AppendLine("Q");
        content.AppendLine("q");
        content.AppendLine("0.90 0.96 1.00 rg");
        content.AppendLine("36 708 540 28 re f");
        content.AppendLine("Q");
        content.AppendLine("BT");
        content.AppendLine("/F1 20 Tf");
        content.AppendLine("1 1 1 rg");
        content.AppendLine($"50 760 Td ({safeTitle}) Tj");
        content.AppendLine("ET");
        content.AppendLine("BT");
        content.AppendLine("/F1 11 Tf");
        content.AppendLine("0.11 0.17 0.30 rg");

        foreach (var line in lines.Take(43))
        {
            var safeLine = PdfEscape(line);
            content.AppendLine($"50 {y} Td ({safeLine}) Tj");
            y -= 16;
        }

        content.AppendLine("ET");

        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());
        var objects = new List<string>
        {
            "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
            "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
            $"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj",
            "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
            $"5 0 obj<< /Length {contentBytes.Length} >>stream\n{content}\nendstream\nendobj"
        };

        var output = new StringBuilder();
        output.AppendLine("%PDF-1.4");

        var xref = new List<int> { 0 };
        foreach (var obj in objects)
        {
            xref.Add(Encoding.ASCII.GetByteCount(output.ToString()));
            output.AppendLine(obj);
        }

        var xrefOffset = Encoding.ASCII.GetByteCount(output.ToString());
        output.AppendLine("xref");
        output.AppendLine($"0 {objects.Count + 1}");
        output.AppendLine("0000000000 65535 f ");
        foreach (var offset in xref.Skip(1))
        {
            output.AppendLine($"{offset:D10} 00000 n ");
        }

        output.AppendLine("trailer");
        output.AppendLine($"<< /Size {objects.Count + 1} /Root 1 0 R >>");
        output.AppendLine("startxref");
        output.AppendLine(xrefOffset.ToString());
        output.AppendLine("%%EOF");

        return Encoding.ASCII.GetBytes(output.ToString());
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
