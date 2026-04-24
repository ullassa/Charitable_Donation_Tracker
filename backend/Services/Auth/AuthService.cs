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
        private const string UnknownCity = "Unknown";
        private const string OtherGender = "Other";
        private const decimal DefaultTargetAmount = 100000m;
        private const string DefaultPincode = "600001";

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

            var normalizedEmail = NormalizeEmail(email);
            var user = _context.Users.Include(u => u.Customer).FirstOrDefault(u => u.Email == normalizedEmail);

            if (user == null)
            {
                _logger.LogWarning("Authentication failed for: {Email}", email);
                return null;
            }

            var storedHash = user.PasswordHash ?? string.Empty;
            var isValid = VerifyPassword(passwordHash, storedHash, email);

            if (isValid && !storedHash.StartsWith("$2"))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(passwordHash);
                _context.SaveChanges();
            }

            if (isValid)
            {
                EnsureCustomerProfileForCustomerRole(user);
                _logger.LogInformation("User authenticated: {Email}", email);
            }
            else
            {
                _logger.LogWarning("Authentication failed for: {Email}", email);
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
            decimal? neededAmount = null,
            IEnumerable<string>? imageUrls = null)
        {
            // Validate inputs
            if (HasMissingRequiredFields(charityName, email, password, phoneNumber))
            {
                _logger.LogWarning("Registration attempt with missing fields");
                return null;
            }

            var normalizedEmail = NormalizeEmail(email);
            var normalizedPhone = NormalizePhone(phoneNumber);

            // Check if phone and email are verified
            if (!otpService.IsPhoneVerified(normalizedPhone))
            {
                _logger.LogWarning("Registration failed: Phone not verified - {Phone}", normalizedPhone);
                return null;
            }

            if (!otpService.IsEmailVerified(normalizedEmail))
            {
                _logger.LogWarning("Registration failed: Email not verified - {Email}", normalizedEmail);
                return null;
            }

            // Check if email already exists
            if (EmailExists(normalizedEmail))
            {
                _logger.LogWarning("Registration failed: Email already exists - {Email}", normalizedEmail);
                return null;
            }

            var parsedState = IndianState.TamilNadu;
            if (!string.IsNullOrWhiteSpace(state) && Enum.TryParse<IndianState>(state.Replace(" ", string.Empty), true, out var stateValue))
            {
                parsedState = stateValue;
            }

            var resolvedAddress = string.IsNullOrWhiteSpace(addressLine)
                ? string.Join(", ", new[] { city, state, country }.Where(part => !string.IsNullOrWhiteSpace(part)))
                : addressLine.Trim();

            // Create user
            var user = new User
            {
                UserName = charityName,
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                PhoneNumber = normalizedPhone,
                UserRole = UserRole.CharityManager,
                IsEmailVerified = true,
                IsPhoneVerified = true,
                IsActive = true
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            _logger.LogInformation("User created: {Email}", normalizedEmail);

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
                AddressLine = string.IsNullOrWhiteSpace(resolvedAddress) ? "Address details pending" : resolvedAddress,
                City = string.IsNullOrWhiteSpace(city) ? UnknownCity : city,
                IndianState = parsedState,
                Pincode = string.IsNullOrWhiteSpace(pincode) ? DefaultPincode : pincode.Trim(),
                ManagerName = string.IsNullOrWhiteSpace(managerName) ? charityName : managerName.Trim(),
                ManagerPhone = string.IsNullOrWhiteSpace(managerPhone) ? normalizedPhone : managerPhone.Trim(),
                SocialMediaLink = string.IsNullOrWhiteSpace(socialMediaLink) ? "https://carefund.example/charity" : socialMediaLink,
                TargetAmount = neededAmount.HasValue && neededAmount.Value > 0 ? neededAmount.Value : DefaultTargetAmount,
                Status = CharityStatus.Pending,
                SubmittedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Charities.Add(charity);
            _context.SaveChanges();

            var normalizedImages = (imageUrls ?? Array.Empty<string>())
                .Select(url => (url ?? string.Empty).Trim())
                .Where(url => !string.IsNullOrWhiteSpace(url))
                .Where(url => url.Length <= 500)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (normalizedImages.Count > 0)
            {
                var imageRows = normalizedImages
                    .Select(url => new CharityImage
                    {
                        CharityRegistrationId = charity.CharityRegistrationId,
                        ImageUrl = url
                    });

                _context.CharityImage.AddRange(imageRows);
                _context.SaveChanges();
            }

            _logger.LogInformation("Charity registration request created: {CharityName} by {Email}", charityName, normalizedEmail);

            // Clear verification flags
            otpService.ClearPhoneVerification(normalizedPhone);
            otpService.ClearEmailVerification(normalizedEmail);

            return user;
        }

        /// <summary>
        /// Registers a new customer account
        /// Requires verified phone and email
        /// </summary>
        public User? RegisterCustomer(string name, string email, string password,
            string phoneNumber, DateTime? dob, string city, string gender, IOtpService otpService)
        {
            if (HasMissingRequiredFields(name, email, password, phoneNumber))
            {
                _logger.LogWarning("Customer registration attempt with missing fields");
                return null;
            }

            var normalizedEmail = NormalizeEmail(email);
            var normalizedPhone = NormalizePhone(phoneNumber);

            if (!otpService.IsPhoneVerified(normalizedPhone))
            {
                _logger.LogWarning("Customer registration failed: Phone not verified - {Phone}", normalizedPhone);
                return null;
            }

            if (!otpService.IsEmailVerified(normalizedEmail))
            {
                _logger.LogWarning("Customer registration failed: Email not verified - {Email}", normalizedEmail);
                return null;
            }

            if (EmailExists(normalizedEmail))
            {
                _logger.LogWarning("Customer registration failed: Email already exists - {Email}", normalizedEmail);
                return null;
            }

            var normalizedGender = NormalizeCustomerGender(gender);

            using var transaction = _context.Database.BeginTransaction();

            var user = new User
            {
                UserName = name,
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                PhoneNumber = normalizedPhone,
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
                City = string.IsNullOrWhiteSpace(city) ? UnknownCity : city,
                Gender = normalizedGender,
                CreatedAt = DateTime.UtcNow,
                IsAnonymousDefault = false
            };

            _context.Customers.Add(customer);
            _context.SaveChanges();
            transaction.Commit();

            otpService.ClearPhoneVerification(normalizedPhone);
            otpService.ClearEmailVerification(normalizedEmail);

            _logger.LogInformation("Customer created: {Email}", normalizedEmail);
            return user;
        }

        private static string NormalizeCustomerGender(string? gender)
        {
            return (gender ?? string.Empty).Trim().ToLowerInvariant() switch
            {
                "male" => "Male",
                "female" => "Female",
                "prefer not to say" => OtherGender,
                "other" => OtherGender,
                _ => OtherGender
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
                City = UnknownCity,
                Gender = OtherGender,
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

            var normalizedEmail = NormalizeEmail(email);
            return _context.Users.FirstOrDefault(u => u.Email == normalizedEmail);
        }

        /// <summary>
        /// Checks if email is already registered
        /// </summary>
        public bool EmailExists(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            var normalizedEmail = NormalizeEmail(email);
            return _context.Users.Any(u => u.Email == normalizedEmail);
        }

        /// <summary>
        /// Checks if phone is already registered
        /// </summary>
        public bool PhoneExists(string phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
                return false;

            var normalizedPhone = NormalizePhone(phoneNumber);
            return _context.Users.Any(u => u.PhoneNumber == normalizedPhone);
        }

        public bool UpdatePassword(string email, string newPasswordHash)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(newPasswordHash))
                return false;

            var normalizedEmail = NormalizeEmail(email);
            var user = _context.Users.FirstOrDefault(u => u.Email == normalizedEmail);
            if (user == null)
                return false;

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPasswordHash);
            _context.SaveChanges();
            return true;
        }

        private static bool HasMissingRequiredFields(params string[] values)
        {
            return values.Any(string.IsNullOrWhiteSpace);
        }

        private static string NormalizeEmail(string email)
        {
            return email.Trim().ToLowerInvariant();
        }

        private static string NormalizePhone(string phoneNumber)
        {
            return phoneNumber.Trim();
        }

        private bool VerifyPassword(string providedPassword, string storedHash, string email)
        {
            try
            {
                return storedHash.StartsWith("$2")
                    ? BCrypt.Net.BCrypt.Verify(providedPassword, storedHash)
                    : string.Equals(providedPassword, storedHash, StringComparison.Ordinal);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Password verification failed for: {Email}", email);
                return false;
            }
        }
    }
}
