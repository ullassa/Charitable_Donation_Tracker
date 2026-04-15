using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CareFund.Enums;

   namespace CareFund.Models
  {
public class Payment
{
    [Key]
    public int PaymentId { get; set; }
 
    [ForeignKey("Donation")]
    public int DonationId { get; set; }
 
    public decimal Amount { get; set; }
 
    public string PaymentStatus { get; set; } = "Success";
 
    public PaymentMethod PaymentMethod { get; set; }
 
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
 
    // Navigation
    public Donation? Donation { get; set; }
}
  }