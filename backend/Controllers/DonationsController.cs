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

        var donorMessage = $"You donated ₹{request.Amount:n2} to {charity.User?.UserName ?? "a charity"} on CareFund. Transaction reference: {payment.TransactionReference}.";
        await _notifications.NotifyUserAsync(user, "Donation received", donorMessage, donation.DonationId);

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
}

public class CreateDonationRequest
{
    public int CharityRegistrationId { get; set; }
    public decimal Amount { get; set; }
    public bool IsAnonymous { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.UPI;
    public string? TransactionReference { get; set; }
}
