using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using CareFund.Data;
using CareFund.Enums;
using CareFund.Models;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Services.Otp
{
    /// <summary>
    /// Service for handling OTP generation, sending, and verification
    /// Uses in-memory storage for temporary OTP state
    /// </summary>
    public class OtpService : IOtpService
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<OtpService> _logger;
        private readonly ApplicationDbContext _context;

        // In-memory storage for temporary OTP state
        // Key: "phone:+1234567890" or "email:user@example.com"
        private static readonly ConcurrentDictionary<string, (string Otp, DateTime ExpiryTime)> PendingOtps = new();
        private static readonly ConcurrentDictionary<string, DateTime> VerifiedPhones = new();
        private static readonly ConcurrentDictionary<string, DateTime> VerifiedEmails = new();

        public OtpService(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<OtpService> logger, ApplicationDbContext context)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// Sends OTP to phone number via Twilio SMS
        /// </summary>
        public async Task<(bool Success, string Message)> SendPhoneOtpAsync(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return (false, "Phone number is required");

            phone = NormalizePhone(phone);

            // Normalize: add + if only digits
            if (!phone.StartsWith("+") && phone.All(char.IsDigit))
            {
                phone = "+" + phone;
            }

            // Validate format
            if (!phone.StartsWith("+"))
                return (false, "Invalid phone format. Use +countrycode-number");

            if (phone.Length < 10)
                return (false, "Phone number too short");

            // Generate OTP and store
            var otp = new Random().Next(100000, 999999).ToString();
            var key = PhoneKey(phone);
            var expiry = DateTime.Now.AddMinutes(5);
            PendingOtps[key] = (otp, expiry);

            // Send via SMS
            var result = await SendSmsAsync(phone, otp);
            if (!result.Success)
            {
                PendingOtps.TryRemove(key, out _);
            }

            return result;
        }

        /// <summary>
        /// Sends OTP to email address via Brevo API
        /// </summary>
        public async Task<(bool Success, string Message)> SendEmailOtpAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return (false, "Email is required");

            email = email.Trim().ToLowerInvariant();

            try
            {
                var parsed = new MailAddress(email);
                email = parsed.Address.ToLowerInvariant();
            }
            catch
            {
                return (false, "Invalid email format");
            }

            // Generate OTP and store
            var otp = new Random().Next(100000, 999999).ToString();
            var key = EmailKey(email);
            var expiry = DateTime.Now.AddMinutes(5);
            PendingOtps[key] = (otp, expiry);

            await PersistOtpForEmailAsync(email, otp, expiry);

            // Send via email
            var result = await SendEmailAsync(email, otp);
            if (!result.Success)
            {
                PendingOtps.TryRemove(key, out _);
            }

            return result;
        }

        /// <summary>
        /// Verifies phone OTP and marks phone as verified
        /// </summary>
        public bool VerifyPhoneOtp(string phone, string otp)
        {
            if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(otp))
                return false;

            phone = NormalizePhone(phone);
            if (!phone.StartsWith("+") && phone.All(char.IsDigit))
            {
                phone = "+" + phone;
            }

            var key = PhoneKey(phone);
            var isValid = VerifyOtpInternal(key, otp);

            if (isValid)
            {
                // Mark as verified for 10 minutes
                VerifiedPhones[key] = DateTime.Now.AddMinutes(10);
                _logger.LogInformation($"Phone verified: {phone}");
            }
            else
            {
                _logger.LogWarning($"Phone OTP verification failed: {phone}");
            }

            return isValid;
        }

        /// <summary>
        /// Verifies email OTP and marks email as verified
        /// </summary>
        public bool VerifyEmailOtp(string email, string otp)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(otp))
                return false;

            email = email.Trim().ToLowerInvariant();
            var key = EmailKey(email);
            var isValid = VerifyOtpInternalWithDatabase(key, email, otp);

            if (isValid)
            {
                // Mark as verified for 10 minutes
                VerifiedEmails[key] = DateTime.Now.AddMinutes(10);
                _logger.LogInformation($"Email verified: {email}");
            }
            else
            {
                _logger.LogWarning($"Email OTP verification failed: {email}");
            }

            return isValid;
        }

        /// <summary>
        /// Checks if phone is currently verified (within 10-min window)
        /// </summary>
        public bool IsPhoneVerified(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return false;

            phone = NormalizePhone(phone);
            if (!phone.StartsWith("+") && phone.All(char.IsDigit))
            {
                phone = "+" + phone;
            }

            var key = PhoneKey(phone);
            return VerifiedPhones.TryGetValue(key, out var expiry) && expiry > DateTime.Now;
        }

        /// <summary>
        /// Checks if email is currently verified (within 10-min window)
        /// </summary>
        public bool IsEmailVerified(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            email = email.Trim().ToLowerInvariant();
            var key = EmailKey(email);
            return VerifiedEmails.TryGetValue(key, out var expiry) && expiry > DateTime.Now;
        }

        /// <summary>
        /// Clears phone verification after successful registration
        /// </summary>
        public void ClearPhoneVerification(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return;

            phone = NormalizePhone(phone);
            if (!phone.StartsWith("+") && phone.All(char.IsDigit))
            {
                phone = "+" + phone;
            }

            VerifiedPhones.TryRemove(PhoneKey(phone), out _);
            _logger.LogInformation($"Phone verification cleared: {phone}");
        }

        /// <summary>
        /// Clears email verification after successful registration
        /// </summary>
        public void ClearEmailVerification(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return;

            email = email.Trim().ToLowerInvariant();
            VerifiedEmails.TryRemove(EmailKey(email), out _);
            _logger.LogInformation($"Email verification cleared: {email}");
        }

        // --- Private Helper Methods ---

        private static string NormalizePhone(string phone)
        {
            var sanitized = phone.Trim()
                                 .Replace(" ", "")
                                 .Replace("-", "")
                                 .Replace("(", "")
                                 .Replace(")", "");

            if (string.IsNullOrWhiteSpace(sanitized))
                return sanitized;

            // Convert 00-prefixed international numbers to + format
            if (sanitized.StartsWith("00"))
                return "+" + sanitized[2..];

            // Already international format
            if (sanitized.StartsWith("+"))
                return sanitized;

            // Default India local mobile (10 digits) to +91
            if (sanitized.All(char.IsDigit) && sanitized.Length == 10)
                return "+91" + sanitized;

            // If India country code entered without +, normalize to +91...
            if (sanitized.All(char.IsDigit) && sanitized.Length == 12 && sanitized.StartsWith("91"))
                return "+" + sanitized;

            // Fallback: add + for all-digit values
            if (sanitized.All(char.IsDigit))
                return "+" + sanitized;

            return sanitized;
        }

        private static string PhoneKey(string phone) => $"phone:{phone.Trim()}";
        private static string EmailKey(string email) => $"email:{email.Trim().ToLowerInvariant()}";

        private bool VerifyOtpInternal(string key, string otp)
        {
            if (!PendingOtps.TryGetValue(key, out var record))
                return false;

            // Check expiry
            if (record.ExpiryTime < DateTime.Now)
            {
                PendingOtps.TryRemove(key, out _);
                return false;
            }

            // Check OTP match
            var valid = record.Otp == otp;
            if (valid)
            {
                PendingOtps.TryRemove(key, out _);
            }

            return valid;
        }

        private async Task<(bool Success, string Message)> SendSmsAsync(string toPhone, string otp)
        {
            try
            {
                if (!IsTwilioConfigured())
                {
                    _logger.LogWarning("Twilio not configured");
                    return (false, "SMS service not configured");
                }

                var sid = _config["Twilio:AccountSid"]!;
                var token = _config["Twilio:AuthToken"]!;
                var from = NormalizeTwilioPhone(_config["Twilio:FromPhone"]!);

                if (string.IsNullOrWhiteSpace(from) || !from.StartsWith("+"))
                {
                    _logger.LogWarning($"Twilio FromPhone is invalid: '{_config["Twilio:FromPhone"]}'");
                    return (false, "Twilio sender number is invalid. Use a full E.164 number like +14155552671.");
                }

                var url = $"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json";
                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new FormUrlEncodedContent(new Dictionary<string, string>
                    {
                        ["To"] = toPhone,
                        ["From"] = from,
                        ["Body"] = $"Your CareFund OTP is {otp}. It expires in 5 minutes."
                    })
                };

                var auth = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{sid}:{token}"));
                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);

                _logger.LogInformation($"Sending SMS to {toPhone} from {from}");
                var response = await client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    string? messageSid = null;
                    string? messageStatus = null;

                    try
                    {
                        using var json = JsonDocument.Parse(content);
                        var root = json.RootElement;
                        messageSid = root.TryGetProperty("sid", out var sidNode) ? sidNode.GetString() : null;
                        messageStatus = root.TryGetProperty("status", out var statusNode) ? statusNode.GetString() : null;
                    }
                    catch
                    {
                        // Twilio success response could not be parsed; keep generic success logs.
                    }

                    _logger.LogInformation($"SMS accepted by Twilio for {toPhone}. Sid: {messageSid ?? "unknown"}, InitialStatus: {messageStatus ?? "unknown"}");

                    if (!string.IsNullOrWhiteSpace(messageSid))
                    {
                        // Quick delivery check so UI can receive immediate actionable feedback
                        await Task.Delay(2500);
                        var details = await GetTwilioMessageStatusDetailsAsync(messageSid, sid, token);
                        if (!string.IsNullOrWhiteSpace(details.Status))
                        {
                            _logger.LogInformation($"Twilio delivery status for {messageSid}: {details.Status} (error_code={details.ErrorCode ?? "n/a"}, error_message={details.ErrorMessage ?? "n/a"})");
                        }

                        var failedStatuses = new[] { "failed", "undelivered", "canceled" };
                        if (!string.IsNullOrWhiteSpace(details.Status) && failedStatuses.Contains(details.Status, StringComparer.OrdinalIgnoreCase))
                        {
                            var errorText = !string.IsNullOrWhiteSpace(details.ErrorCode)
                                ? $"Twilio {details.ErrorCode}: {details.ErrorMessage ?? details.Status}"
                                : $"SMS {details.Status}: {details.ErrorMessage ?? "Carrier or account restrictions"}";

                            return (false, errorText);
                        }

                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                await Task.Delay(5000);
                                var finalDetails = await GetTwilioMessageStatusDetailsAsync(messageSid, sid, token);
                                _logger.LogInformation($"Twilio follow-up status for {messageSid}: {finalDetails.Status ?? "unknown"} (error_code={finalDetails.ErrorCode ?? "n/a"}, error_message={finalDetails.ErrorMessage ?? "n/a"})");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning($"Unable to fetch Twilio final delivery status for {messageSid}: {ex.Message}");
                            }
                        });
                    }

                    return (true, "SMS accepted by Twilio");
                }

                var error = await response.Content.ReadAsStringAsync();
                _logger.LogError($"Twilio error: {response.StatusCode} - {error}");

                var twilioMessage = $"SMS delivery failed: {response.StatusCode}";
                try
                {
                    using var json = JsonDocument.Parse(error);
                    var root = json.RootElement;
                    var code = root.TryGetProperty("code", out var c) ? c.ToString() : "";
                    var message = root.TryGetProperty("message", out var m) ? m.GetString() : "Twilio request failed";
                    var moreInfo = root.TryGetProperty("more_info", out var mi) ? mi.GetString() : null;

                    if (!string.IsNullOrWhiteSpace(code))
                    {
                        twilioMessage = $"Twilio {code}: {message}";
                    }
                    else
                    {
                        twilioMessage = $"SMS delivery failed: {message}";
                    }

                    if (!string.IsNullOrWhiteSpace(moreInfo))
                    {
                        twilioMessage += $" ({moreInfo})";
                    }
                }
                catch
                {
                    // Keep generic message if Twilio response is not JSON
                }

                return (false, twilioMessage);
            }
            catch (Exception ex)
            {
                _logger.LogError($"SMS exception: {ex.Message}");
                return (false, $"SMS delivery failed: {ex.Message}");
            }
        }

        private async Task<(bool Success, string Message)> SendEmailAsync(string toEmail, string otp)
        {
            try
            {
                var apiResult = await SendEmailViaBrevoApiAsync(
                    toEmail,
                    "Your CareFund OTP",
                    $"Your OTP is {otp}. It expires in 5 minutes.");

                return apiResult;
            }
            catch (Exception ex)
            {
                _logger.LogError($"Email exception: {ex.Message}");
                var inner = ex.InnerException?.Message;
                var details = string.IsNullOrWhiteSpace(inner) ? ex.Message : $"{ex.Message} | {inner}";
                return (false, $"Email delivery failed: {details}");
            }
        }

        private async Task PersistOtpForEmailAsync(string email, string otp, DateTime expiry)
        {
            try
            {
                var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
                if (user == null)
                    return;

                var record = new CareFund.Models.Otp
                {
                    UserId = user.UserId,
                    OtpCode = otp,
                    OtpType = OtpType.ForgotPassword,
                    ExpiryTime = expiry,
                    CreatedAt = DateTime.UtcNow,
                    IsUsed = false
                };

                _context.OTPs.Add(record);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Unable to persist OTP for {email}");
            }
        }

        private bool VerifyOtpInternalWithDatabase(string key, string email, string otp)
        {
            if (VerifyOtpInternal(key, otp))
                return true;

            var user = _context.Users.FirstOrDefault(u => u.Email == email);
            if (user == null)
                return false;

            var record = _context.OTPs
                .Where(x => x.UserId == user.UserId && x.OtpType == OtpType.ForgotPassword && !x.IsUsed)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefault();

            if (record == null || record.ExpiryTime < DateTime.Now || record.OtpCode != otp)
                return false;

            record.IsUsed = true;
            _context.SaveChanges();
            return true;
        }

        private bool IsTwilioConfigured() =>
            !string.IsNullOrWhiteSpace(_config["Twilio:AccountSid"]) &&
            !string.IsNullOrWhiteSpace(_config["Twilio:AuthToken"]) &&
            !string.IsNullOrWhiteSpace(_config["Twilio:FromPhone"]);

        private static string NormalizeTwilioPhone(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone))
                return string.Empty;

            var sanitized = phone.Trim()
                                 .Replace(" ", "")
                                 .Replace("-", "")
                                 .Replace("(", "")
                                 .Replace(")", "");

            if (sanitized.StartsWith("00"))
                return "+" + sanitized[2..];

            if (sanitized.StartsWith("+"))
                return sanitized;

            if (sanitized.All(char.IsDigit))
                return "+" + sanitized;

            return sanitized;
        }

        private bool HasBrevoApiKey() =>
            !string.IsNullOrWhiteSpace(_config["Brevo:ApiKey"]);

        private async Task<(string? Status, string? ErrorCode, string? ErrorMessage)> GetTwilioMessageStatusDetailsAsync(string messageSid, string accountSid, string authToken)
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"https://api.twilio.com/2010-04-01/Accounts/{accountSid}/Messages/{messageSid}.json";
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            var auth = Convert.ToBase64String(System.Text.Encoding.ASCII.GetBytes($"{accountSid}:{authToken}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", auth);

            var response = await client.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"Twilio message status lookup failed for {messageSid}: {response.StatusCode} - {content}");
                return (null, null, null);
            }

            try
            {
                using var json = JsonDocument.Parse(content);
                var root = json.RootElement;
                var status = root.TryGetProperty("status", out var statusNode) ? statusNode.GetString() : null;
                var errorCode = root.TryGetProperty("error_code", out var errorCodeNode) ? errorCodeNode.GetRawText() : null;
                var errorMessage = root.TryGetProperty("error_message", out var errorMessageNode) ? errorMessageNode.GetString() : null;

                if (!string.IsNullOrWhiteSpace(errorCode) && errorCode != "null")
                {
                    return (status, errorCode, errorMessage);
                }

                return (status, null, errorMessage);
            }
            catch
            {
                return (null, null, null);
            }
        }

        private async Task<(bool Success, string Message)> SendEmailViaBrevoApiAsync(string toEmail, string subject, string htmlContent)
        {
            try
            {
                var apiKey = _config["Brevo:ApiKey"];
                var fromEmail = _config["Brevo:FromEmail"] ?? "noreply@carefund.com";
                var fromName = _config["Brevo:FromName"] ?? "CareFund";

                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    return (false, "Brevo API key not configured");
                }

                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                request.Headers.Add("api-key", apiKey);

                var payload = new
                {
                    sender = new { name = fromName, email = fromEmail },
                    to = new[] { new { email = toEmail } },
                    subject,
                    htmlContent
                };

                request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

                var response = await client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"Email sent via Brevo API to {toEmail}");
                    return (true, "Email sent");
                }

                _logger.LogError($"Brevo API error: {response.StatusCode} - {content}");
                return (false, $"Email delivery failed via Brevo API: {response.StatusCode}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Brevo API exception: {ex.Message}");
                return (false, $"Email delivery failed via Brevo API: {ex.Message}");
            }
        }
    }
}
