using Microsoft.AspNetCore.Mvc;
using CareFund.Models;
using CareFund.Services.Auth;
using CareFund.Services.Jwt;
using CareFund.Services.Otp;
using CareFund.DTOs.Auth;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IJwtService _jwtService;
    private readonly IOtpService _otpService;

    public AuthController(IAuthService authService, IJwtService jwtService, IOtpService otpService)
    {
        _authService = authService;
        _jwtService = jwtService;
        _otpService = otpService;
    }

    // 🔐 LOGIN
    [HttpPost("login")]
    public IActionResult Login(LoginRequest loginUser)
    {
        var user = _authService.AuthenticateUser(loginUser.Email, loginUser.PasswordHash);

        if (user == null)
            return Unauthorized(new { success = false, message = "Invalid credentials" });

        var token = _jwtService.GenerateToken(user);
        return Ok(new { success = true, token = token, message = "Login successful" });
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
    public IActionResult RegisterCharity(RegisterCharityDto dto)
    {
        if (dto == null)
            return BadRequest(new { success = false, message = "Request body is required." });

        var user = _authService.RegisterCharity(dto.CharityName, dto.Email, dto.Password,
            dto.PhoneNumber, _otpService);

        if (user == null)
            return BadRequest(new { success = false, message = "Registration failed. Verify phone and email first." });

        return Ok(new { success = true, message = "Charity registered successfully", userId = user.UserId });
    }
}