namespace CareFund.DTOs.Auth
{
    /// <summary>
    /// Request DTO for verifying OTP
    /// </summary>
    public class VerifyOtpRequest
    {
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Otp { get; set; }
    }
}
