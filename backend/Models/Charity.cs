using System.ComponentModel.DataAnnotations;
 
public class Charity
{
    [Key]
    public int CharityId { get; set; }
 
    [Required]
    public string RegistrationId { get; set; }
 
    [Required]
    public string CharityName { get; set; }
 
    public string Description { get; set; }
 
    public string Cause { get; set; }
 
    public string Location { get; set; }
 
    public string PhoneNumber { get; set; }
 
    public string Email { get; set; }
 
    public CharityStatus Status { get; set; }
 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 
    public int UserId { get; set; }
 
    public bool IsActive { get; set; } = true;
 
    // Navigation
    public User User { get; set; }
    public ICollection<Donation> Donations { get; set; }
}