using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using CareFund.Enums;
   namespace CareFund.Models
  {
public class OTP
{
    [Key]
    public int OtpId { get; set; }
 
    [ForeignKey("User")]
    public int UserId { get; set; }
 
    [Required]
    public string OtpCode { get; set; } = string.Empty;
 
    public OtpType OtpType { get; set; }
 
    public DateTime ExpiryTime { get; set; }
 
    public bool IsUsed { get; set; }
 
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
 
    // Navigation
    public User? User { get; set; }
}
  }