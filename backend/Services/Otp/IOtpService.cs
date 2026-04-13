namespace CareFund.Services.Otp
{
    /// <summary>
    /// Interface for OTP (One-Time Password) operations
    /// Handles generation, sending, and verification of OTPs
    /// </summary>
    public interface IOtpService
    {
        /// <summary>
        /// Sends OTP to phone number via SMS
        /// </summary>
        Task<(bool Success, string Message)> SendPhoneOtpAsync(string phone);

        /// <summary>
        /// Sends OTP to email address
        /// </summary>
        Task<(bool Success, string Message)> SendEmailOtpAsync(string email);

        /// <summary>
        /// Verifies OTP for phone number
        /// </summary>
        bool VerifyPhoneOtp(string phone, string otp);

        /// <summary>
        /// Verifies OTP for email
        /// </summary>
        bool VerifyEmailOtp(string email, string otp);

        /// <summary>
        /// Checks if phone number is verified (within 10-minute window)
        /// </summary>
        bool IsPhoneVerified(string phone);

        /// <summary>
        /// Checks if email is verified (within 10-minute window)
        /// </summary>
        bool IsEmailVerified(string email);

        /// <summary>
        /// Clears verification flag after successful registration
        /// </summary>
        void ClearPhoneVerification(string phone);

        /// <summary>
        /// Clears email verification flag after successful registration
        /// </summary>
        void ClearEmailVerification(string email);
    }
}
