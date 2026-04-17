using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using CareFund.Models;
using CareFund.Data;
using CareFund.Services.Auth;
using CareFund.Services.Jwt;
using CareFund.Services.Otp;
using CareFund.DTOs.Auth;
using CareFund.Enums;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IJwtService _jwtService;
    private readonly IOtpService _otpService;
    private readonly ApplicationDbContext _context;

    public AuthController(IAuthService authService, IJwtService jwtService, IOtpService otpService, ApplicationDbContext context)
    {
        _authService = authService;
        _jwtService = jwtService;
        _otpService = otpService;
        _context = context;
    }

    // LOGIN
    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest loginUser)
    {
        try
        {
            var email = loginUser.Email?.Trim().ToLowerInvariant() ?? string.Empty;
            var password = !string.IsNullOrWhiteSpace(loginUser.PasswordHash)
                ? loginUser.PasswordHash
                : (loginUser.Password ?? string.Empty);
            var user = _authService.AuthenticateUser(email, password);

            if (user == null)
                return Unauthorized(new { success = false, message = "Invalid credentials" });

            var token = _jwtService.GenerateToken(user);
            return Ok(new
            {
                success = true,
                token,
                role = user.UserRole.ToString(),
                userId = user.UserId,
                userName = user.UserName,
                message = "Login successful"
            });
        }
        catch (SqlException ex)
        {
            return StatusCode(503, new { success = false, message = "SQL Server connection failed.", details = ex.Message, errorNumber = ex.Number });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { success = false, message = "Database connection failed. Check SQL Server and connection string.", details = ex.Message });
        }
    }

    // -----------------------
    // PHONE OTP
    // -----------------------
    [HttpPost("send-phone-otp")]
    public async Task<IActionResult> SendPhoneOtp([FromQuery] string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return BadRequest(new OtpResponse { Success = false, Message = "Phone is required." });

        var (success, message) = await _otpService.SendPhoneOtpAsync(phone);
        return success ? Ok(new OtpResponse { Success = true, Message = message })
                       : BadRequest(new OtpResponse
                       {
                           Success = false,
                           Message = message,
                           Hint = "If using Twilio trial, verify recipient number in Twilio Console and enable SMS for destination country (India)."
                       });
    }

    [HttpPost("verify-phone-otp")]
    public IActionResult VerifyPhoneOtp([FromQuery] string phone, [FromQuery] string otp)
    {
        if (string.IsNullOrWhiteSpace(phone) || string.IsNullOrWhiteSpace(otp))
            return BadRequest(new OtpResponse { Success = false, Message = "Phone and OTP are required." });

        var isValid = _otpService.VerifyPhoneOtp(phone, otp);
        return isValid ? Ok(new OtpResponse { Success = true, Message = "Phone OTP verified" })
                       : BadRequest(new OtpResponse { Success = false, Message = "Invalid or expired OTP. Request a new one." });
    }

    // -----------------------
    // EMAIL OTP
    // -----------------------
    [HttpPost("send-email-otp")]
    public async Task<IActionResult> SendEmailOtp([FromQuery] string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new OtpResponse { Success = false, Message = "Email is required." });

        var (success, message) = await _otpService.SendEmailOtpAsync(email);
        return success ? Ok(new OtpResponse { Success = true, Message = message })
                       : BadRequest(new OtpResponse
                       {
                           Success = false,
                           Message = message,
                           Hint = "If SMTP is blocked, set Brevo:ApiKey and keep a verified sender in Brevo. Brevo API fallback runs over HTTPS (port 443)."
                       });
    }

    [HttpPost("verify-email-otp")]
    public IActionResult VerifyEmailOtp([FromQuery] string email, [FromQuery] string otp)
    {
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(otp))
            return BadRequest(new OtpResponse { Success = false, Message = "Email and OTP are required." });

        var isValid = _otpService.VerifyEmailOtp(email, otp);
        return isValid ? Ok(new OtpResponse { Success = true, Message = "Email OTP verified" })
                       : BadRequest(new OtpResponse { Success = false, Message = "Invalid or expired OTP. Request a new one." });
    }

    // 🏢 REGISTER CHARITY
    [HttpPost("register-charity")]
    public IActionResult RegisterCharity([FromBody] RegisterCharityDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        var charityName = string.IsNullOrWhiteSpace(dto.CharityName) ? dto.Name : dto.CharityName;
        var email = dto.Email?.Trim().ToLowerInvariant();
        var phone = dto.PhoneNumber?.Trim();

        if (string.IsNullOrWhiteSpace(charityName) || string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(phone))
        {
            return BadRequest(new { success = false, message = "Missing required fields. Charity name, email, password, and phone are required." });
        }

        if (!_otpService.IsEmailVerified(email))
            return BadRequest(new { success = false, message = "Email is not verified yet." });

        if (!_otpService.IsPhoneVerified(phone))
            return BadRequest(new { success = false, message = "Phone is not verified yet." });

        if (_authService.EmailExists(email))
            return BadRequest(new { success = false, message = "Email already exists." });

        try
        {
            var parsedCause = CauseType.GeneralCharity;
            if (!string.IsNullOrWhiteSpace(dto.CauseType) &&
                Enum.TryParse<CauseType>(dto.CauseType, true, out var cause))
            {
                parsedCause = cause;
            }

            var websiteLinks = (dto.WebsiteLinks ?? new List<string>())
                .Where(link => !string.IsNullOrWhiteSpace(link))
                .Select(link => link.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!string.IsNullOrWhiteSpace(dto.SocialMediaLink))
            {
                websiteLinks.Insert(0, dto.SocialMediaLink.Trim());
                websiteLinks = websiteLinks.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            }

            var user = _authService.RegisterCharity(charityName, email, dto.Password,
                phone, _otpService,
                dto.RegistrationId,
                parsedCause,
                dto.City,
                websiteLinks.Count > 0 ? string.Join(", ", websiteLinks) : null,
                dto.Mission,
                dto.About,
                dto.Activities);

            if (user == null)
                return BadRequest(new { success = false, message = "Registration failed. Check database fields and verification." });

            var imageUrls = (dto.ImageUrls ?? new List<string>())
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .Select(url => url.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(10)
                .ToList();

            if (imageUrls.Count > 0)
            {
                var charity = _context.Charities.FirstOrDefault(c => c.UserId == user.UserId);
                if (charity != null)
                {
                    foreach (var imageUrl in imageUrls)
                    {
                        _context.CharityImage.Add(new CharityImage
                        {
                            CharityRegistrationId = charity.CharityRegistrationId,
                            ImageUrl = imageUrl,
                    
                         
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            _context.Notifications.Add(new Notification
            {
                UserId = user.UserId,
                NotificationType = NotificationType.Email,
                Message = "Thank you for registering with CareFund. Your charity profile is pending admin approval."
            });
            _context.SaveChanges();

            return Ok(new { success = true, message = "Charity registered successfully", userId = user.UserId });
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return Conflict(new { success = false, message = "Phone number or email already exists.", details = ex.InnerException?.Message, errorNumber = ((SqlException)ex.InnerException).Number });
        }
        catch (SqlException ex)
        {
            return StatusCode(503, new { success = false, message = "SQL Server connection failed.", details = ex.Message, errorNumber = ex.Number });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { success = false, message = "Database connection failed. Check SQL Server and connection string." , details = ex.Message });
        }
    }

    [HttpPost("register-customer")]
    public IActionResult RegisterCustomer([FromBody] RegisterCustomerDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        var name = string.IsNullOrWhiteSpace(dto.Name) ? dto.Email : dto.Name;
        var email = dto.Email?.Trim().ToLowerInvariant();
        var phone = dto.PhoneNumber?.Trim();

        if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(phone))
        {
            return BadRequest(new { success = false, message = "Missing required fields. Name, email, password, and phone are required." });
        }

        if (!_otpService.IsEmailVerified(email))
            return BadRequest(new { success = false, message = "Email is not verified yet." });

        if (!_otpService.IsPhoneVerified(phone))
            return BadRequest(new { success = false, message = "Phone is not verified yet." });

        if (_authService.EmailExists(email))
            return BadRequest(new { success = false, message = "Email already exists." });

        // if (_authService.PhoneExists(phone))
        //     return Conflict(new { success = false, message = "Phone number already exists. Please use a different phone number." });

        try
        {
            DateTime? dob = null;
            if (!string.IsNullOrWhiteSpace(dto.Dob) && DateTime.TryParse(dto.Dob, out var parsedDob))
            {
                dob = parsedDob;
            }

            var normalizedGender = (dto.Gender ?? string.Empty).Trim();
            var allowedGenders = new[] { "Male", "Female", "Prefer not to say" };
            if (string.IsNullOrWhiteSpace(normalizedGender) || !allowedGenders.Any(g => string.Equals(g, normalizedGender, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest(new { success = false, message = "Gender is required. Allowed values: Male, Female, Prefer not to say." });
            }

            normalizedGender = allowedGenders.First(g => string.Equals(g, normalizedGender, StringComparison.OrdinalIgnoreCase));

            var user = _authService.RegisterCustomer(name, email, dto.Password, phone, dob, dto.City, normalizedGender, _otpService);

            if (user == null)
                return BadRequest(new { success = false, message = "Registration failed. Check database fields and verification." });

            _context.Notifications.Add(new Notification
            {
                UserId = user.UserId,
                NotificationType = NotificationType.Email,
                Message = "Thank you for registering with CareFund."
            });
            _context.SaveChanges();

            return Ok(new { success = true, message = "Customer registered successfully", userId = user.UserId });
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return Conflict(new { success = false, message = "Phone number or email already exists.", details = ex.InnerException?.Message, errorNumber = ((SqlException)ex.InnerException).Number });
        }
        catch (SqlException ex)
        {
            return StatusCode(503, new { success = false, message = "SQL Server connection failed.", details = ex.Message, errorNumber = ex.Number });
        }
        catch (Exception ex)
        {
            return StatusCode(503, new { success = false, message = "Database connection failed. Check SQL Server and connection string.", details = ex.Message });
        }
    }

    [HttpGet("public-charities")]
    public async Task<IActionResult> GetPublicCharities([FromQuery] string? keyword = null, [FromQuery] string? cause = null)
    {
        try
        {
            var charities = await _context.Charities
                .AsNoTracking()
                .Include(c => c.User)
                .Where(c => c.IsActive && c.Status == CharityStatus.Approved)
                .Where(c => c.User != null)
                .Where(c => string.IsNullOrWhiteSpace(keyword)
                    || (c.User != null && c.User.UserName.Contains(keyword))
                    || (c.RegistrationId != null && c.RegistrationId.Contains(keyword))
                    || c.City.Contains(keyword))
                .Where(c => string.IsNullOrWhiteSpace(cause)
                    || c.CauseType.ToString().Contains(cause))
                .OrderByDescending(c => c.SubmittedAt)
                .Select(c => new
                {
                    charityId = c.CharityRegistrationId,
                    charityName = c.User != null ? c.User.UserName : string.Empty,
                    description = c.About,
                    cause = c.CauseType.ToString(),
                    location = c.City,
                    phoneNumber = c.ManagerPhone,
                    email = c.User != null ? c.User.Email : string.Empty,
                    status = c.Status.ToString(),
                    isActive = c.IsActive
                })
                .ToListAsync();

            return Ok(new { success = true, items = charities });
        }
        catch (SqlException ex)
        {
            return StatusCode(503, new { success = false, message = "SQL Server connection failed.", details = ex.Message, errorNumber = ex.Number });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Failed to fetch charities.", details = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { success = false, message = "Email is required." });

        var email = request.Email.Trim().ToLowerInvariant();
        var existing = _authService.GetUserByEmail(email);
        if (existing == null)
            return Ok(new { success = true, message = "If this email is registered, an OTP has been sent." });

        var (success, message) = await _otpService.SendEmailOtpAsync(email);
        if (!success)
            return BadRequest(new { success = false, message });

        return Ok(new { success = true, message = "Password reset OTP sent to your email." });
    }

    [HttpPost("reset-password")]
    public IActionResult ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { success = false, message = "Email, OTP and new password are required." });
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var isOtpValid = _otpService.VerifyEmailOtp(email, request.Otp);
        if (!isOtpValid)
            return BadRequest(new { success = false, message = "Invalid or expired OTP." });

        var updated = _authService.UpdatePassword(email, request.NewPassword);
        if (!updated)
            return NotFound(new { success = false, message = "User not found." });

        return Ok(new { success = true, message = "Password reset successful." });
    }

    [HttpPost("verify-forgot-password-otp")]
    public IActionResult VerifyForgotPasswordOtp([FromBody] VerifyForgotPasswordOtpRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
            return BadRequest(new { success = false, message = "Email and OTP are required." });

        var email = request.Email.Trim().ToLowerInvariant();
        var isOtpValid = _otpService.VerifyEmailOtp(email, request.Otp.Trim());
        if (!isOtpValid)
            return BadRequest(new { success = false, message = "Invalid or expired OTP." });

        return Ok(new { success = true, message = "OTP verified successfully." });
    }
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class VerifyForgotPasswordOtpRequest
{
    public string Email { get; set; } = string.Empty;
    public string Otp { get; set; } = string.Empty;
}