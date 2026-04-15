using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CareFund.Enums;
  namespace CareFund.Models
  {

  
public class Donation
{
    [Key]
    public int DonationId { get; set; }
 
    [ForeignKey("Customer")]
    public int CustomerId { get; set; }
 
    [ForeignKey("Charity")]
    public int CharityId { get; set; }
 
    public decimal Amount { get; set; }
 
    public DateTime DonationDate { get; set; } = DateTime.UtcNow;
 
    public bool IsAnonymous { get; set; }
 
    public DonationStatus DonationStatus { get; set; }
 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 
    // Navigation
    public Customer? Customer { get; set; }
    public Charity? Charity { get; set; }
    //public Payment Payment { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
  }