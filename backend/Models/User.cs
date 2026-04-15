using System.ComponentModel.DataAnnotations;
using CareFund.Enums;
   namespace CareFund.Models
  {
public class User
{
    [Key]
    public int UserId { get; set; }
 
    [Required]
    public string UserName { get; set; } = string.Empty;
 
    [Required]
    public string Email { get; set; } = string.Empty;
 
    [Required]
    public string PhoneNumber { get; set; } = string.Empty;
 
    [Required]
    public UserRole UserRole { get; set; }
 
    public bool IsActive { get; set; } = true;
 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
 
    public bool IsEmailVerified { get; set; }
    public bool IsPhoneVerified { get; set; }
 
    // Navigation
    public Customer? Customer { get; set; }
    public ICollection<OTP> OTPs { get; set; } = new List<OTP>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public ICollection<Charity> Charities { get; set; } = new List<Charity>();
 
}
  }