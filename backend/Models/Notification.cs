using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CareFund.Enums;
   namespace CareFund.Models
  {
public class Notification
{
    [Key]
    public int NotificationId { get; set; }
 
    [ForeignKey("User")]
    public int UserId { get; set; }
 
    [ForeignKey("Donation")]
    public int DonationId { get; set; }
 
    public string Message { get; set; } = string.Empty;
 
    public NotificationType NotificationType { get; set; }
 
    public DateTime SentAt { get; set; }
 
    public string Status { get; set; } = string.Empty;
 
    // Navigation
    public User? User { get; set; }
    public Donation? Donation { get; set; }
}
  }