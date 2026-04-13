using CareFund.Data;
using CareFund.Models;
using CareFund.Enums;
using CareFund.Services.Otp;

namespace CareFund.Services.Auth
{
    /// <summary>
    /// Service for authentication operations
    /// Handles user authentication and registration
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AuthService> _logger;

        public AuthService(ApplicationDbContext context, ILogger<AuthService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Authenticates user by matching email and password hash
        /// </summary>
        public User? AuthenticateUser(string email, string passwordHash)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(passwordHash))
                return null;

            var user = _context.Users.FirstOrDefault(u =>
                u.Email == email &&
                u.PasswordHash == passwordHash);

            if (user != null)
            {
                _logger.LogInformation($"User authenticated: {email}");
            }
            else
            {
                _logger.LogWarning($"Authentication failed for: {email}");
            }

            return user;
        }

        /// <summary>
        /// Registers a new charity organization
        /// Requires verified phone and email
        /// </summary>
        public User? RegisterCharity(string charityName, string email, string password,
            string phoneNumber, IOtpService otpService)
        {
            // Validate inputs
            if (string.IsNullOrWhiteSpace(charityName) ||
                string.IsNullOrWhiteSpace(email) ||
                string.IsNullOrWhiteSpace(password) ||
                string.IsNullOrWhiteSpace(phoneNumber))
            {
                _logger.LogWarning("Registration attempt with missing fields");
                return null;
            }

            // Check if phone and email are verified
            if (!otpService.IsPhoneVerified(phoneNumber))
            {
                _logger.LogWarning($"Registration failed: Phone not verified - {phoneNumber}");
                return null;
            }

            if (!otpService.IsEmailVerified(email))
            {
                _logger.LogWarning($"Registration failed: Email not verified - {email}");
                return null;
            }

            // Check if email already exists
            if (EmailExists(email))
            {
                _logger.LogWarning($"Registration failed: Email already exists - {email}");
                return null;
            }

            // Create user
            var user = new User
            {
                UserName = charityName,
                Email = email,
                PasswordHash = password,
                PhoneNumber = phoneNumber,
                UserRole = UserRole.CharityManager
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            _logger.LogInformation($"User created: {email}");

            // Create charity
            var charity = new Charity
            {
                UserId = user.UserId,
                CharityName = charityName
            };

            _context.Charities.Add(charity);
            _context.SaveChanges();

            _logger.LogInformation($"Charity created: {charityName} by {email}");

            // Clear verification flags
            otpService.ClearPhoneVerification(phoneNumber);
            otpService.ClearEmailVerification(email);

            return user;
        }

        /// <summary>
        /// Gets user by email
        /// </summary>
        public User? GetUserByEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;

            return _context.Users.FirstOrDefault(u => u.Email == email);
        }

        /// <summary>
        /// Checks if email is already registered
        /// </summary>
        public bool EmailExists(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            return _context.Users.Any(u => u.Email == email);
        }
    }
}
