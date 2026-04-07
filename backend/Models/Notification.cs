using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
 
public class Notification
{
    [Key]
    public int NotificationId { get; set; }
 
    [ForeignKey("User")]
    public int UserId { get; set; }
 
    [ForeignKey("Donation")]
    public int DonationId { get; set; }
 
    public string Message { get; set; }
 
    public NotificationType NotificationType { get; set; }
 
    public DateTime SentAt { get; set; }
 
    public string Status { get; set; }
 
    // Navigation
    public User User { get; set; }
    public Donation Donation { get; set; }
}