using System.Text;
using System.Text.Json;
using CareFund.Data;
using CareFund.Enums;
using CareFund.Models;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Services.Notifications;

public class NotificationEmailService : INotificationEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<NotificationEmailService> _logger;
    private readonly ApplicationDbContext _context;

    public NotificationEmailService(IConfiguration configuration, ILogger<NotificationEmailService> logger, ApplicationDbContext context)
    {
        _configuration = configuration;
        _logger = logger;
        _context = context;
    }

    public async Task NotifyUserAsync(User user, string subject, string message, int? donationId = null)
    {
        if (user == null || string.IsNullOrWhiteSpace(user.Email))
            return;

        _context.Notifications.Add(new Notification
        {
            UserId = user.UserId,
            DonationId = donationId,
            NotificationType = NotificationType.Email,
            Message = message,
            SentAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        await SendEmailAsync(user.Email, user.UserName, subject, message);
    }

    public async Task NotifyUsersAsync(IEnumerable<User> users, string subject, string message)
    {
        var distinctUsers = users
            .Where(u => u != null && !string.IsNullOrWhiteSpace(u.Email))
            .GroupBy(u => u.UserId)
            .Select(g => g.First())
            .ToList();

        if (distinctUsers.Count == 0)
            return;

        foreach (var user in distinctUsers)
        {
            _context.Notifications.Add(new Notification
            {
                UserId = user.UserId,
                NotificationType = NotificationType.Email,
                Message = message,
                SentAt = DateTime.UtcNow
            });
        }

        await _context.SaveChangesAsync();

        foreach (var user in distinctUsers)
        {
            await SendEmailAsync(user.Email, user.UserName, subject, message);
        }
    }

    private async Task SendEmailAsync(string toEmail, string recipientName, string subject, string message)
    {
        try
        {
            var apiKey = _configuration["Brevo:ApiKey"];
            var fromEmail = _configuration["Brevo:FromEmail"] ?? "noreply@carefund.com";
            var fromName = _configuration["Brevo:FromName"] ?? "CareFund";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("Brevo API key is not configured. Email notification skipped for {Email}.", toEmail);
                return;
            }

            var htmlBody = BuildHtmlBody(recipientName, subject, message);
            var client = new HttpClient();
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
            request.Headers.Add("api-key", apiKey);

            var payload = new
            {
                sender = new { name = fromName, email = fromEmail },
                to = new[] { new { email = toEmail, name = recipientName } },
                subject,
                htmlContent = htmlBody
            };

            request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await client.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Brevo email send failed for {Email}: {Status} - {Content}", toEmail, response.StatusCode, content);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send notification email to {Email}", toEmail);
        }
    }

    private static string BuildHtmlBody(string recipientName, string subject, string message)
    {
        var safeName = string.IsNullOrWhiteSpace(recipientName) ? "CareFund user" : recipientName;
        var safeSubject = System.Net.WebUtility.HtmlEncode(subject);
        var safeMessage = System.Net.WebUtility.HtmlEncode(message).Replace("\n", "<br>");

        return $@"<!doctype html>
<html>
<body style='margin:0;background:#f6f8fc;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;'>
  <div style='max-width:640px;margin:0 auto;padding:32px 16px;'>
    <div style='background:#ffffff;border-radius:18px;padding:28px;border:1px solid #e5e7eb;box-shadow:0 12px 32px rgba(15,23,42,.08);'>
      <div style='font-size:22px;font-weight:700;color:#2563eb;margin-bottom:8px;'>CareFund</div>
      <h2 style='margin:0 0 16px 0;font-size:24px;line-height:1.2;'>{safeSubject}</h2>
      <p style='font-size:16px;line-height:1.7;margin:0 0 16px 0;'>Hello {System.Net.WebUtility.HtmlEncode(safeName)},</p>
      <p style='font-size:16px;line-height:1.8;margin:0 0 24px 0;'>{safeMessage}</p>
      <div style='padding:16px 18px;background:#eff6ff;border-left:4px solid #2563eb;border-radius:12px;font-size:14px;line-height:1.7;'>
        Thank you for being part of CareFund. Your action has been recorded and your dashboard stays synced in real time.
      </div>
    </div>
    <p style='text-align:center;color:#6b7280;font-size:12px;margin:16px 0 0;'>This is an automated message from CareFund.</p>
  </div>
</body>
</html>";
    }
}