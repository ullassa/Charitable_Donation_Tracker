using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

 
public class Payment
{
    [Key]
    public int PaymentId { get; set; }
 
    [ForeignKey("Donation")]
    public int DonationId { get; set; }
 
    public decimal Amount { get; set; }
 
    public PaymentStatus PaymentStatus { get; set; }
 
    public string PaymentMethod { get; set; }
 
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
 
    // Navigation
    public Donation Donation { get; set; }
}