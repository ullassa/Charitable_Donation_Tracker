using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CareFund.Data;
using CareFund.Models;
using CareFund.Enums;
using CareFund.Services.AuditLogs;
using CareFund.Services.Notifications;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GatewayController : ControllerBase
{
    private readonly IConfiguration _config;
    private readonly ApplicationDbContext _context;
    private readonly INotificationEmailService _notifications;
    private readonly IAuditLogService _auditLogs;
    private readonly IHttpClientFactory _httpFactory;

    public GatewayController(IConfiguration config, ApplicationDbContext context, INotificationEmailService notifications, IAuditLogService auditLogs, IHttpClientFactory httpFactory)
    {
        _config = config;
        _context = context;
        _notifications = notifications;
        _auditLogs = auditLogs;
        _httpFactory = httpFactory;
    }

    [HttpGet("razorpay-config")]
    [AllowAnonymous]
    public IActionResult GetRazorpayConfig()
    {
        var keyId = _config["Razorpay:KeyId"]?.Trim();
        if (string.IsNullOrWhiteSpace(keyId) || keyId.Contains("your-razorpay-key-id", StringComparison.OrdinalIgnoreCase))
        {
            return Ok(new
            {
                success = false,
                enabled = false,
                message = "Razorpay is not configured. Set Razorpay__KeyId in backend .env to enable checkout."
            });
        }

        return Ok(new
        {
            success = true,
            enabled = true,
            keyId,
            mode = (_config["Razorpay:Mode"] ?? "test").Trim().ToLowerInvariant(),
            currency = (_config["Razorpay:Currency"] ?? "INR").Trim().ToUpperInvariant(),
            merchantName = _config["Razorpay:MerchantName"] ?? "CareFund Foundation",
            description = _config["Razorpay:Description"] ?? "Donation payment"
        });
    }

    public class CreateOrderRequest
    {
        public int CharityRegistrationId { get; set; }
        public decimal Amount { get; set; }
        public string? Upivpa { get; set; }
        public string? TransactionReference { get; set; }
        public string? PaymentMethod { get; set; }
        public string? ContactNumber { get; set; }
        public string? WalletNumber { get; set; }
    }

    [HttpPost("create-order")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> CreateRazorpayOrder([FromBody] CreateOrderRequest request)
    {
        if (request == null || request.CharityRegistrationId <= 0 || request.Amount <= 0)
            return BadRequest(new { success = false, message = "Valid charity and amount required." });

        var email = User?.Identity?.Name ?? User?.FindFirst("email")?.Value ?? User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || user.UserRole != Enums.UserRole.Customer || user.Customer == null)
            return Forbid();

        var pm = Enums.PaymentMethod.Card;
        if (!string.IsNullOrWhiteSpace(request.PaymentMethod))
        {
            Enum.TryParse<Enums.PaymentMethod>(request.PaymentMethod, true, out pm);
        }

        var notesObj = new 
        { 
            upi = request.Upivpa, 
            charity = request.CharityRegistrationId, 
            userId = user.UserId, 
            paymentMethod = pm.ToString(),
            contact = request.ContactNumber,
            wallet = request.WalletNumber
        };
        var payment = new Payment
        {
            PaymentMethod = pm,
            TransactionReference = string.IsNullOrWhiteSpace(request.TransactionReference) ? $"CF-{DateTime.UtcNow:yyyyMMddHHmmssfff}" : request.TransactionReference,
            Amount = request.Amount,
            Currency = _config["Razorpay:Currency"] ?? "INR",
            Status = "Pending",
            GatewayName = "Razorpay",
            PaymentDate = DateTime.UtcNow,
            Notes = System.Text.Json.JsonSerializer.Serialize(notesObj)
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        var keyId = _config["Razorpay:KeyId"]?.Trim();
        var keySecret = _config["Razorpay:KeySecret"]?.Trim();

        string? orderId = null;
        if (!string.IsNullOrWhiteSpace(keyId) && !string.IsNullOrWhiteSpace(keySecret))
        {
            try
            {
                var client = _httpFactory.CreateClient();
                var auth = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{keyId}:{keySecret}"));
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", auth);
                var payload = new
                {
                    amount = (int)Math.Round(request.Amount * 100),
                    currency = (_config["Razorpay:Currency"] ?? "INR").Trim().ToUpperInvariant(),
                    receipt = payment.TransactionReference,
                    payment_capture = 1,
                    notes = new 
                    { 
                        charity = request.CharityRegistrationId,
                        paymentMethod = pm.ToString(),
                        userId = user.UserId
                    }
                };

                var resp = await client.PostAsJsonAsync("https://api.razorpay.com/v1/orders", payload);
                if (resp.IsSuccessStatusCode)
                {
                    var doc = await resp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                    if (doc.TryGetProperty("id", out var idProp)) orderId = idProp.GetString();
                }
            }
            catch { /* swallow - fallback to mock order id */ }
        }

        if (string.IsNullOrWhiteSpace(orderId))
        {
            orderId = $"order_mock_{payment.PaymentId}_{DateTime.UtcNow.Ticks}";
        }

        // store order id in notes (no schema change)
        try
        {
            payment.Notes = (payment.Notes ?? "") + "|order:" + orderId;
            _context.Payments.Update(payment);
            await _context.SaveChangesAsync();
        }
        catch { /* ignore */ }

        return Ok(new
        {
            success = true,
            orderId,
            paymentId = payment.PaymentId,
            keyId = keyId
        });
    }

    public class FinalizeRequest
    {
        public int PaymentId { get; set; }
        public string RazorpayPaymentId { get; set; } = string.Empty;
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string RazorpaySignature { get; set; } = string.Empty;
        public int CharityRegistrationId { get; set; }
        public decimal Amount { get; set; }
        public bool IsAnonymous { get; set; }
    }

    [HttpPost("finalize")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> FinalizeRazorpayPayment([FromBody] FinalizeRequest req)
    {
        var keySecret = _config["Razorpay:KeySecret"]?.Trim();

        // verify signature if secret is present
        if (!string.IsNullOrWhiteSpace(keySecret))
        {
            var payload = $"{req.RazorpayOrderId}|{req.RazorpayPaymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var generated = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            if (!string.Equals(generated, req.RazorpaySignature?.ToLowerInvariant(), StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, message = "Invalid signature" });
            }
        }

        var email = User?.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == email);
        if (user == null || user.Customer == null)
            return Forbid();

        var payment = await _context.Payments.FindAsync(req.PaymentId);
        if (payment == null)
            return NotFound(new { success = false, message = "Payment record not found" });

        payment.TransactionId = req.RazorpayPaymentId;
        payment.Status = "Completed";
        payment.PaymentDate = DateTime.UtcNow;
        _context.Payments.Update(payment);
        await _context.SaveChangesAsync();

        // create donation now
        var donation = new Donation
        {
            CustomerId = user.Customer.CustomerId,
            CharityRegistrationId = req.CharityRegistrationId,
            Amount = req.Amount,
            DonationDate = DateTime.UtcNow,
            IsAnonymous = req.IsAnonymous,
            PaymentId = payment.PaymentId
        };

        _context.Donations.Add(donation);
        await _context.SaveChangesAsync();

        await _auditLogs.LogAsync(user.UserId, user.UserRole, "Donation", "Donation", donation.DonationId, $"Customer donated ₹{req.Amount:n2} to Charity ID {req.CharityRegistrationId} via Razorpay.");

        await _notifications.NotifyUserAsync(user, "Donation received", $"You donated ₹{req.Amount:n2} to {req.CharityRegistrationId}. Transaction: {payment.TransactionReference}", donation.DonationId);

        var charity = await _context.Charities.Include(c => c.User).FirstOrDefaultAsync(c => c.CharityRegistrationId == req.CharityRegistrationId);
        if (charity?.User != null)
        {
            await _notifications.NotifyUserAsync(charity.User, "New donation received", $"Your charity received a donation of ₹{req.Amount:n2} from a CareFund donor.", donation.DonationId);
        }

        return Ok(new { success = true, donationId = donation.DonationId, paymentReference = payment.TransactionReference });
    }

    // Dev-only: mark a pending payment as completed and create donation (Admin only)
    public class DevCompleteRequest
    {
        public int CharityRegistrationId { get; set; }
        public decimal Amount { get; set; }
        public bool IsAnonymous { get; set; }
        public string? CustomerEmail { get; set; }
    }

    [HttpPost("dev/complete/{paymentId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DevCompletePayment(int paymentId, [FromBody] DevCompleteRequest req)
    {
        var payment = await _context.Payments.FindAsync(paymentId);
        if (payment == null)
            return NotFound(new { success = false, message = "Payment not found" });

        // attempt to get userId from notes
        int? userIdFromNotes = null;
        try
        {
            var notesRaw = payment.Notes ?? "";
            var jsonPart = notesRaw.Split('|')[0];
            var je = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(jsonPart);
            if (je.ValueKind == System.Text.Json.JsonValueKind.Object && je.TryGetProperty("userId", out var idProp) && idProp.TryGetInt32(out var uid))
                userIdFromNotes = uid;
        }
        catch { }

        User? user = null;
        if (!string.IsNullOrWhiteSpace(req.CustomerEmail))
            user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == req.CustomerEmail);

        if (user == null && userIdFromNotes.HasValue)
            user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.UserId == userIdFromNotes.Value);

        if (user == null || user.Customer == null)
            return BadRequest(new { success = false, message = "Customer not found for creating donation. Provide CustomerEmail or ensure order was created by a customer." });

        payment.TransactionId = $"DEV-{DateTime.UtcNow.Ticks}";
        payment.Status = "Completed";
        payment.PaymentDate = DateTime.UtcNow;
        _context.Payments.Update(payment);
        await _context.SaveChangesAsync();

        var donation = new Donation
        {
            CustomerId = user.Customer.CustomerId,
            CharityRegistrationId = req.CharityRegistrationId,
            Amount = req.Amount,
            DonationDate = DateTime.UtcNow,
            IsAnonymous = req.IsAnonymous,
            PaymentId = payment.PaymentId
        };

        _context.Donations.Add(donation);
        await _context.SaveChangesAsync();

        await _auditLogs.LogAsync(user.UserId, user.UserRole, "Donation", "Donation", donation.DonationId, $"Admin marked payment {paymentId} complete and created donation {donation.DonationId}.");
        await _notifications.NotifyUserAsync(user, "Donation received", $"You donated ₹{req.Amount:n2}. Transaction: {payment.TransactionReference}", donation.DonationId);

        var charity = await _context.Charities.Include(c => c.User).FirstOrDefaultAsync(c => c.CharityRegistrationId == req.CharityRegistrationId);
        if (charity?.User != null)
        {
            await _notifications.NotifyUserAsync(charity.User, "New donation received", $"Your charity received a donation of ₹{req.Amount:n2} from a CareFund donor.", donation.DonationId);
        }

        return Ok(new { success = true, donationId = donation.DonationId });
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> RazorpayWebhook()
    {
        var body = string.Empty;
        using (var reader = new System.IO.StreamReader(Request.Body))
        {
            body = await reader.ReadToEndAsync();
        }

        var sigHeader = Request.Headers["X-Razorpay-Signature"].FirstOrDefault() ?? Request.Headers["x-razorpay-signature"].FirstOrDefault();
        var webhookSecret = _config["Razorpay:WebhookSecret"]?.Trim();

        if (!string.IsNullOrWhiteSpace(webhookSecret) && string.IsNullOrWhiteSpace(sigHeader))
            return BadRequest(new { success = false, message = "Missing signature header" });

        if (!string.IsNullOrWhiteSpace(webhookSecret) && !string.IsNullOrWhiteSpace(sigHeader))
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(webhookSecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(body));
            var hex = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            var b64 = Convert.ToBase64String(hash);
            if (!string.Equals(hex, sigHeader, StringComparison.OrdinalIgnoreCase) && !string.Equals(b64, sigHeader, StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { success = false, message = "Invalid webhook signature" });
            }
        }

        try
        {
            var doc = System.Text.Json.JsonDocument.Parse(body);
            var root = doc.RootElement;
            var eventType = root.GetProperty("event").GetString();

            // handle payment captured/authorized
            if (eventType?.StartsWith("payment.") == true)
            {
                var paymentEntity = root.GetProperty("payload").GetProperty("payment").GetProperty("entity");
                var razorpayPaymentId = paymentEntity.GetProperty("id").GetString();
                var razorpayOrderId = paymentEntity.TryGetProperty("order_id", out var oid) ? oid.GetString() : null;
                var amount = paymentEntity.TryGetProperty("amount", out var a) ? a.GetInt32() / 100m : 0m;

                Payment? payment = null;
                if (!string.IsNullOrWhiteSpace(razorpayOrderId))
                {
                    payment = await _context.Payments.FirstOrDefaultAsync(p => (p.Notes ?? "").Contains(razorpayOrderId));
                }

                if (payment != null)
                {
                    payment.TransactionId = razorpayPaymentId;
                    payment.Status = "Completed";
                    payment.PaymentDate = DateTime.UtcNow;
                    _context.Payments.Update(payment);
                    await _context.SaveChangesAsync();

                    // attempt to extract userId and charity from notes
                    int? userId = null;
                    int? charityId = null;
                    try
                    {
                        var notesRaw = payment.Notes ?? "";
                        var jsonPart = notesRaw.Split('|')[0];
                        var je = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(jsonPart);
                        if (je.ValueKind == System.Text.Json.JsonValueKind.Object)
                        {
                            if (je.TryGetProperty("userId", out var up) && up.TryGetInt32(out var uid)) userId = uid;
                            if (je.TryGetProperty("charity", out var cp) && cp.TryGetInt32(out var cid)) charityId = cid;
                        }
                    }
                    catch { }

                    if (userId.HasValue && charityId.HasValue)
                    {
                        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.UserId == userId.Value);
                        if (user?.Customer != null)
                        {
                            var donation = new Donation
                            {
                                CustomerId = user.Customer.CustomerId,
                                CharityRegistrationId = charityId.Value,
                                Amount = amount > 0 ? amount : payment.Amount,
                                DonationDate = DateTime.UtcNow,
                                IsAnonymous = false,
                                PaymentId = payment.PaymentId
                            };

                            _context.Donations.Add(donation);
                            await _context.SaveChangesAsync();

                            await _auditLogs.LogAsync(user.UserId, user.UserRole, "Donation", "Donation", donation.DonationId, $"Donation recorded via webhook for ₹{donation.Amount:n2}.");
                            await _notifications.NotifyUserAsync(user, "Donation received", $"You donated ₹{donation.Amount:n2}. Transaction: {payment.TransactionReference}", donation.DonationId);
                            var charity = await _context.Charities.Include(c => c.User).FirstOrDefaultAsync(c => c.CharityRegistrationId == charityId.Value);
                            if (charity?.User != null)
                            {
                                await _notifications.NotifyUserAsync(charity.User, "New donation received", $"Your charity received a donation of ₹{donation.Amount:n2}.", donation.DonationId);
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            // swallow but log if needed
        }

        return Ok(new { success = true });
    }
}
