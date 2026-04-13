using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Mail;
using System.Text;
using System.Text.Json;

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

        // In-memory storage for temporary OTP state
        // Key: "phone:+1234567890" or "email:user@example.com"
        private static readonly ConcurrentDictionary<string, (string Otp, DateTime ExpiryTime)> PendingOtps = new();
        private static readonly ConcurrentDictionary<string, DateTime> VerifiedPhones = new();
        private static readonly ConcurrentDictionary<string, DateTime> VerifiedEmails = new();

        public OtpService(IConfiguration config, IHttpClientFactory httpClientFactory, ILogger<OtpService> logger)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
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
        /// Sends OTP to email address via SMTP
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
            var isValid = VerifyOtpInternal(key, otp);

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

        private static string NormalizePhone(string phone) =>
            phone.Trim()
                 .Replace(" ", "")
                 .Replace("-", "")
                 .Replace("(", "")
                 .Replace(")", "");

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
                var from = _config["Twilio:FromPhone"]!;

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

                _logger.LogInformation($"Sending SMS to {toPhone}");
                var response = await client.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation($"SMS sent successfully to {toPhone}");
                    return (true, "SMS sent");
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

                    if (!string.IsNullOrWhiteSpace(code))
                    {
                        twilioMessage = $"Twilio {code}: {message}";
                    }
                    else
                    {
                        twilioMessage = $"SMS delivery failed: {message}";
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
                if (!IsSmtpConfigured())
                {
                    _logger.LogWarning("SMTP not configured");
                    return (false, "Email service not configured");
                }

                var host = _config["Smtp:Host"]!;
                var portText = _config["Smtp:Port"];
                var username = _config["Smtp:Username"]!;
                var password = _config["Smtp:Password"]!;
                var fromEmail = _config["Smtp:FromEmail"]!;
                var enableSsl = bool.TryParse(_config["Smtp:EnableSsl"], out var ssl) ? ssl : true;
                var configuredPort = int.TryParse(portText, out var p) ? p : 587;

                var portsToTry = new List<int> { configuredPort };
                if (host.Equals("smtp-relay.brevo.com", StringComparison.OrdinalIgnoreCase))
                {
                    if (!portsToTry.Contains(587)) portsToTry.Add(587);
                    if (!portsToTry.Contains(2525)) portsToTry.Add(2525);
                    if (!portsToTry.Contains(465)) portsToTry.Add(465);
                }

                Exception? lastException = null;
                foreach (var port in portsToTry)
                {
                    try
                    {
                        using var client = new SmtpClient(host, port)
                        {
                            DeliveryMethod = SmtpDeliveryMethod.Network,
                            UseDefaultCredentials = false,
                            Credentials = new NetworkCredential(username, password),
                            EnableSsl = enableSsl,
                            Timeout = 20000
                        };

                        using var message = new MailMessage(fromEmail, toEmail)
                        {
                            Subject = "Your CareFund OTP",
                            Body = $"Your OTP is {otp}. It expires in 5 minutes."
                        };

                        _logger.LogInformation($"Attempting SMTP send to {toEmail} via {host}:{port}");
                        await client.SendMailAsync(message);
                        _logger.LogInformation($"Email sent to {toEmail} via {host}:{port}");
                        return (true, "Email sent");
                    }
                    catch (Exception ex)
                    {
                        lastException = ex;
                        _logger.LogWarning($"SMTP attempt failed on {host}:{port} - {ex.Message}");
                    }
                }

                if (HasBrevoApiKey())
                {
                    _logger.LogInformation("Attempting Brevo API fallback for email delivery");
                    var apiResult = await SendEmailViaBrevoApiAsync(toEmail, otp, fromEmail);
                    if (apiResult.Success)
                    {
                        return apiResult;
                    }
                }
                else
                {
                    _logger.LogWarning("SMTP failed and Brevo:ApiKey is not configured. API fallback skipped.");
                    return (false, "SMTP connection blocked and Brevo API key is missing. Set Brevo:ApiKey in appsettings.json.");
                }

                throw lastException ?? new SmtpException(SmtpStatusCode.GeneralFailure, "SMTP send failed on all configured ports");
            }
            catch (SmtpFailedRecipientException ex)
            {
                _logger.LogError($"Email recipient failed: {toEmail} - {ex.Message}");
                return (false, "Email rejected by recipient server. Check email address.");
            }
            catch (SmtpException ex)
            {
                _logger.LogError($"SMTP exception: {ex.StatusCode} - {ex.Message}");
                var inner = ex.InnerException?.Message;
                var details = string.IsNullOrWhiteSpace(inner) ? ex.Message : $"{ex.Message} | {inner}";
                return (false, $"Email delivery failed ({ex.StatusCode}): {details}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Email exception: {ex.Message}");
                var inner = ex.InnerException?.Message;
                var details = string.IsNullOrWhiteSpace(inner) ? ex.Message : $"{ex.Message} | {inner}";
                return (false, $"Email delivery failed: {details}");
            }
        }

        private bool IsSmtpConfigured() =>
            !string.IsNullOrWhiteSpace(_config["Smtp:Host"]) &&
            !string.IsNullOrWhiteSpace(_config["Smtp:Username"]) &&
            !string.IsNullOrWhiteSpace(_config["Smtp:Password"]) &&
            !string.IsNullOrWhiteSpace(_config["Smtp:FromEmail"]);

        private bool IsTwilioConfigured() =>
            !string.IsNullOrWhiteSpace(_config["Twilio:AccountSid"]) &&
            !string.IsNullOrWhiteSpace(_config["Twilio:AuthToken"]) &&
            !string.IsNullOrWhiteSpace(_config["Twilio:FromPhone"]);

        private bool HasBrevoApiKey() =>
            !string.IsNullOrWhiteSpace(_config["Brevo:ApiKey"]);

        private async Task<(bool Success, string Message)> SendEmailViaBrevoApiAsync(string toEmail, string otp, string fromEmail)
        {
            try
            {
                var apiKey = _config["Brevo:ApiKey"];
                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    return (false, "Brevo API key not configured");
                }

                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                request.Headers.Add("api-key", apiKey);

                var payload = new
                {
                    sender = new { name = "CareFund", email = fromEmail },
                    to = new[] { new { email = toEmail } },
                    subject = "Your CareFund OTP",
                    textContent = $"Your OTP is {otp}. It expires in 5 minutes."
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
