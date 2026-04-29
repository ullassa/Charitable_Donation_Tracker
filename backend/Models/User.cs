using System.ComponentModel.DataAnnotations; 

using Microsoft.EntityFrameworkCore; 

using CareFund.Enums; 

using CareFund.Models; 

  

namespace CareFund.Models 

{ 

    [Index(nameof(Email), IsUnique = true)] 

    [Index(nameof(PhoneNumber), IsUnique = true)] 

  

    public class User 

    { 

        [Key] 

        public int UserId { get; set; } 

  

        [Required(ErrorMessage = "UserName is required")] 

        [StringLength(100, MinimumLength = 3, 

            ErrorMessage = "UserName must be between 3 and 100 characters")] 

        public string UserName { get; set; } = string.Empty; 

  

  

        [Required(ErrorMessage = "Email is required")] 

        [EmailAddress(ErrorMessage = "Invalid email format")] 

        [StringLength(150)] 

        public string Email { get; set; } = string.Empty; 

  

  

        [Required(ErrorMessage = "Phone number is required")] 

        [RegularExpression(@"^(\+91[\-\s]?)?[6-9]\d{9}$", 

            ErrorMessage = "Enter valid Indian mobile number")] 

        public string PhoneNumber { get; set; } = string.Empty; 

  

        [Required] 

        [StringLength(500)] 

        public string PasswordHash { get; set; } = string.Empty; 

  

  

        [Required] 

        public UserRole UserRole { get; set; } 

  

        public bool IsEmailVerified { get; set; } = false; 

  

        public bool IsPhoneVerified { get; set; } = false; 

        [StringLength(500)] 
        public string? AddressLine { get; set; } 

         

  

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow; 

  

        public bool IsActive { get; set; } = true; 

  

  

        // NAVIGATION PROPERTIES 

  

        public Customer? Customer { get; set; } 

  

        public ICollection<CharityRegistrationRequest>? CharityRegistrationRequests { get; set; } 

  

        public ICollection<Notification>? Notifications { get; set; } 

  

        public ICollection<Otp>? Otps { get; set; } 

    } 

} 