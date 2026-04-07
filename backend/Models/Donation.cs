using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
 
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
 
    public DonationStatus Status { get; set; }
 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 
    // Navigation
    public Customer Customer { get; set; }
    public Charity Charity { get; set; }
    public Payment Payment { get; set; }
}