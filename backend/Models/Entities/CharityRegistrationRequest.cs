using System.ComponentModel.DataAnnotations; 

using System.ComponentModel.DataAnnotations.Schema; 

using CareFund.Enums; 

  

namespace CareFund.Models 

{ 

    public class CharityRegistrationRequest 

    { 

        [Key] 

        public int CharityRegistrationId { get; set; } 

 

        [Required] 

        public int UserId { get; set; } 

  

        // [Required(ErrorMessage = "Charity name is required")] 

        // [StringLength(200, MinimumLength = 3)] 

        // public string CharityName { get; set; } 

  

        [Required(ErrorMessage = "Government Registration ID is required")] 

        [StringLength(100)] 

        public string? RegistrationId { get; set; } 

  

        [Required] 

        [StringLength(5000, MinimumLength = 20)] 

        public string Mission { get; set; } = string.Empty; 

  

        [Required] 

        [StringLength(5000, MinimumLength = 20)] 

        public string About { get; set; } = string.Empty; 

  

        [Required] 

        [StringLength(5000, MinimumLength = 20)] 

        public string Activities { get; set; } = string.Empty; 

        [Range(1, 1000000000, ErrorMessage = "Target amount must be greater than zero")]
        public decimal TargetAmount { get; set; } = 100000;

  

        [Required] 

        public CauseType CauseType { get; set; } 

  

        [Required] 

        [StringLength(300)] 

        public string AddressLine { get; set; } = string.Empty; 

  

 

        [Required] 

        [StringLength(100)] 

        public string City { get; set; } = string.Empty; 

  

        [Required] 

        public IndianState IndianState { get; set; } 

  

        [Required] 

        [RegularExpression(@"^[1-9][0-9]{5}$", 

            ErrorMessage = "Enter valid 6 digit pincode")] 

        public string? Pincode { get; set; } 

  

        [Required] 

        [StringLength(150)] 

        public string? ManagerName { get; set; } 

  

        [Required] 

        [RegularExpression(@"^(\+91[\-\s]?)?[6-9]\d{9}$", 

            ErrorMessage = "Enter valid Indian mobile number")] 

        public string? ManagerPhone { get; set; } 

  

        [Required] 

        [Url(ErrorMessage = "Enter valid URL")] 

        [StringLength(300)] 

        public string? SocialMediaLink { get; set; } 

  

        [Required] 

        public CharityStatus Status { get; set; } = CharityStatus.Pending; 

  

        [StringLength(1000)] 

        public string? AdminComment { get; set; } 

  

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow; 

  

        public DateTime? ReviewedAt { get; set; } 

  

        public bool IsActive { get; set; } = true; 

  

  

        [ForeignKey("UserId")] 

        public User? User { get; set; } 

  

  

        public ICollection<CharityImage>? Images { get; set; } 

  

  

        public ICollection<Donation>? Donations { get; set; } 

    } 

} 

 