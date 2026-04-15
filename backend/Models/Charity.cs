using System.ComponentModel.DataAnnotations;
using CareFund.Enums;
 namespace CareFund.Models
 {
    
public class Charity
{
    [Key]
    public int CharityId { get; set; }
 
    [Required]
    public string RegistrationId { get; set; } = string.Empty;
 
    [Required]
    public string CharityName { get; set; } = string.Empty;
 
    public string Description { get; set; } = string.Empty;
 
    public string Cause { get; set; } = string.Empty;
 
    public string Location { get; set; } = string.Empty;
 
    public string PhoneNumber { get; set; } = string.Empty;
 
    public string Email { get; set; } = string.Empty;
 
    public CharityStatus CharityStatus { get; set; }
 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 
    public int UserId { get; set; }
 
    public bool IsActive { get; set; } = true;
 
    // Navigation
    public User? User { get; set; }
    //public ICollection<Donation> Donations { get; set; }
    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
 }
 //saddssdf