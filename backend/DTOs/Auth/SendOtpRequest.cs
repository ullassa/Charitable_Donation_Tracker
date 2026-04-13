namespace CareFund.DTOs.Auth
{
    /// <summary>
    /// Request DTO for sending OTP to phone/email
    /// </summary>
    public class SendOtpRequest
    {
        public string? Phone { get; set; }
        public string? Email { get; set; }
    }
}
