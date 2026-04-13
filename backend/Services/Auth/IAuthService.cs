using CareFund.Data;
using CareFund.Models;
using CareFund.Services.Otp;

namespace CareFund.Services.Auth
{
    /// <summary>
    /// Interface for authentication-related operations
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Authenticates user by email and password hash
        /// Returns user if credentials are valid
        /// </summary>
        User? AuthenticateUser(string email, string passwordHash);

        /// <summary>
        /// Registers a new charity with verified phone and email
        /// </summary>
        User? RegisterCharity(string charityName, string email, string password,
            string phoneNumber, IOtpService otpService);

        /// <summary>
        /// Gets user by email
        /// </summary>
        User? GetUserByEmail(string email);

        /// <summary>
        /// Checks if email already exists
        /// </summary>
        bool EmailExists(string email);
    }
}
