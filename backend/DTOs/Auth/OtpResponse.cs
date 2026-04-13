namespace CareFund.DTOs.Auth
{
    /// <summary>
    /// Response DTO for OTP operations
    /// </summary>
    public class OtpResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Hint { get; set; }
    }
}
