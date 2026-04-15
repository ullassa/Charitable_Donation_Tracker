using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CareFund.Enums;
  namespace CareFund.Models{

public class Customer
{
    [Key]
    public int CustomerId { get; set; }
 
    [ForeignKey("User")]
    public int UserId { get; set; }
 
    public DateTime DOB { get; set; }
 
    public string City { get; set; } = string.Empty;
 
    public string Gender { get; set; } = string.Empty;
 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 
    public bool IsAnonymous { get; set; }
 
    // Navigation
    public User? User { get; set; }
    public ICollection<Donation> Donations { get; set; } = new List<Donation>();
}
  }