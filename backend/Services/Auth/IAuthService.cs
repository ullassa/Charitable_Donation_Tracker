using CareFund.Data;
using CareFund.Models;
using CareFund.Services.Otp;
using CareFund.Enums;

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
            string phoneNumber, IOtpService otpService,
            string? registrationId = null,
            CauseType causeType = CauseType.GeneralCharity,
            string? city = null,
            string? state = null,
            string? country = null,
            string? addressLine = null,
            string? pincode = null,
            string? managerName = null,
            string? managerPhone = null,
            string? socialMediaLink = null,
            string? mission = null,
            string? about = null,
            string? activities = null,
            IEnumerable<string>? imageUrls = null);

        /// <summary>
        /// Registers a new customer with verified phone and email
        /// </summary>
        User? RegisterCustomer(string name, string email, string password,
            string phoneNumber, DateTime? dob, string city, string gender, IOtpService otpService);

        /// <summary>
        /// Gets user by email
        /// </summary>
        User? GetUserByEmail(string email);

        /// <summary>
        /// Checks if email already exists
        /// </summary>
        bool EmailExists(string email);

        /// <summary>
        /// Checks if phone number already exists
        /// </summary>
        bool PhoneExists(string phoneNumber);

        /// <summary>
        /// Updates password for an existing user
        /// </summary>
        bool UpdatePassword(string email, string newPasswordHash);
    }
}
