using CareFund.Data;
using CareFund.Models;
using CareFund.Enums;
using CareFund.Services.Otp;
using Microsoft.EntityFrameworkCore;

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

            var normalizedEmail = email.Trim().ToLowerInvariant();
            var user = _context.Users.Include(u => u.Customer).FirstOrDefault(u => u.Email == normalizedEmail);

            if (user == null)
            {
                _logger.LogWarning($"Authentication failed for: {email}");
                return null;
            }

            var storedHash = user.PasswordHash ?? string.Empty;
            var isValid = false;

            try
            {
                isValid = storedHash.StartsWith("$2")
                    ? BCrypt.Net.BCrypt.Verify(passwordHash, storedHash)
                    : string.Equals(passwordHash, storedHash, StringComparison.Ordinal);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Password verification failed for: {email}");
                isValid = false;
            }

            if (isValid && !storedHash.StartsWith("$2"))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(passwordHash);
                _context.SaveChanges();
            }

            if (isValid)
            {
                EnsureCustomerProfileForCustomerRole(user);
                _logger.LogInformation($"User authenticated: {email}");
            }
            else
            {
                _logger.LogWarning($"Authentication failed for: {email}");
                return null;
            }

            return user;
        }

        /// <summary>
        /// Registers a new charity organization
        /// Requires verified phone and email
        /// </summary>
        public User? RegisterCharity(string charityName, string email, string password,
            string phoneNumber, IOtpService otpService,
            string? registrationId = null,
            CauseType causeType = CauseType.GeneralCharity,
            string? city = null,
            string? socialMediaLink = null,
            string? mission = null,
            string? about = null,
            string? activities = null)
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
                Email = email.Trim().ToLowerInvariant(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                PhoneNumber = phoneNumber,
                UserRole = UserRole.CharityManager,
                IsEmailVerified = true,
                IsPhoneVerified = true,
                IsActive = true
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            _logger.LogInformation($"User created: {email}");

            // Create charity registration request (pending admin approval)
            var charity = new CharityRegistrationRequest
            {
                UserId = user.UserId,
                RegistrationId = string.IsNullOrWhiteSpace(registrationId)
                    ? $"CF-{DateTime.UtcNow:yyyyMMddHHmmss}-{user.UserId}"
                    : registrationId,
                Mission = string.IsNullOrWhiteSpace(mission) ? "Mission details pending completion by charity organization." : mission,
                About = string.IsNullOrWhiteSpace(about) ? "This organization has submitted details and awaits admin review." : about,
                Activities = string.IsNullOrWhiteSpace(activities) ? "Activity information will be updated by the organization after onboarding." : activities,
                CauseType = causeType,
                AddressLine = "Address details pending",
                City = string.IsNullOrWhiteSpace(city) ? "Unknown" : city,
                IndianState = IndianState.TamilNadu,
                Pincode = "600001",
                ManagerName = charityName,
                ManagerPhone = phoneNumber,
                SocialMediaLink = string.IsNullOrWhiteSpace(socialMediaLink) ? "https://carefund.example/charity" : socialMediaLink,
                Status = CharityStatus.Pending,
                SubmittedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Charities.Add(charity);
            _context.SaveChanges();

            _logger.LogInformation($"Charity registration request created: {charityName} by {email}");

            // Clear verification flags
            otpService.ClearPhoneVerification(phoneNumber);
            otpService.ClearEmailVerification(email);

            return user;
        }

        /// <summary>
        /// Registers a new customer account
        /// Requires verified phone and email
        /// </summary>
        public User? RegisterCustomer(string name, string email, string password,
            string phoneNumber, DateTime? dob, string city, string gender, IOtpService otpService)
        {
            if (string.IsNullOrWhiteSpace(name) ||
                string.IsNullOrWhiteSpace(email) ||
                string.IsNullOrWhiteSpace(password) ||
                string.IsNullOrWhiteSpace(phoneNumber))
            {
                _logger.LogWarning("Customer registration attempt with missing fields");
                return null;
            }

            if (!otpService.IsPhoneVerified(phoneNumber))
            {
                _logger.LogWarning($"Customer registration failed: Phone not verified - {phoneNumber}");
                return null;
            }

            if (!otpService.IsEmailVerified(email))
            {
                _logger.LogWarning($"Customer registration failed: Email not verified - {email}");
                return null;
            }

            if (EmailExists(email))
            {
                _logger.LogWarning($"Customer registration failed: Email already exists - {email}");
                return null;
            }

            var normalizedGender = NormalizeCustomerGender(gender);

            using var transaction = _context.Database.BeginTransaction();

            var user = new User
            {
                UserName = name,
                Email = email.Trim().ToLowerInvariant(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                PhoneNumber = phoneNumber,
                UserRole = UserRole.Customer,
                IsEmailVerified = true,
                IsPhoneVerified = true,
                IsActive = true
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            var customer = new Customer
            {
                UserId = user.UserId,
                DateOfBirth = dob ?? DateTime.UtcNow,
                City = string.IsNullOrWhiteSpace(city) ? "Unknown" : city,
                Gender = normalizedGender,
                CreatedAt = DateTime.UtcNow,
                IsAnonymousDefault = false
            };

            _context.Customers.Add(customer);
            _context.SaveChanges();
            transaction.Commit();

            otpService.ClearPhoneVerification(phoneNumber);
            otpService.ClearEmailVerification(email);

            _logger.LogInformation($"Customer created: {email}");
            return user;
        }

        private static string NormalizeCustomerGender(string? gender)
        {
            return (gender ?? string.Empty).Trim().ToLowerInvariant() switch
            {
                "male" => "Male",
                "female" => "Female",
                "prefer not to say" => "Other",
                "other" => "Other",
                _ => "Other"
            };
        }

        private void EnsureCustomerProfileForCustomerRole(User user)
        {
            if (user.UserRole != UserRole.Customer || user.Customer != null)
                return;

            _logger.LogWarning("Customer profile missing for user {UserId}. Creating fallback customer record.", user.UserId);

            var fallbackCustomer = new Customer
            {
                UserId = user.UserId,
                DateOfBirth = DateTime.UtcNow,
                City = "Unknown",
                Gender = "Other",
                CreatedAt = DateTime.UtcNow,
                IsAnonymousDefault = false
            };

            _context.Customers.Add(fallbackCustomer);
            _context.SaveChanges();
            user.Customer = fallbackCustomer;
        }

        /// <summary>
        /// Gets user by email
        /// </summary>
        public User? GetUserByEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return null;

            var normalizedEmail = email.Trim().ToLowerInvariant();
            return _context.Users.FirstOrDefault(u => u.Email == normalizedEmail);
        }

        /// <summary>
        /// Checks if email is already registered
        /// </summary>
        public bool EmailExists(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            var normalizedEmail = email.Trim().ToLowerInvariant();
            return _context.Users.Any(u => u.Email == normalizedEmail);
        }

        /// <summary>
        /// Checks if phone is already registered
        /// </summary>
        public bool PhoneExists(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return false;

            var normalizedPhone = phoneNumber.Trim();
            return _context.Users.Any(u => u.PhoneNumber == normalizedPhone);
        }

        public bool UpdatePassword(string email, string newPasswordHash)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(newPasswordHash))
                return false;

            var normalizedEmail = email.Trim().ToLowerInvariant();
            var user = _context.Users.FirstOrDefault(u => u.Email == normalizedEmail);
            if (user == null)
                return false;

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPasswordHash);
            _context.SaveChanges();
            return true;
        }
    }
}
