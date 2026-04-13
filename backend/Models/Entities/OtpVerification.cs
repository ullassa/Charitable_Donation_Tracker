using System.ComponentModel.DataAnnotations;

namespace CareFund.Models;

public class OtpVerification
{
    [Key]
    public int OtpId { get; set; }
    public int UserId { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string OtpCode { get; set; } = string.Empty;
    public DateTime ExpiryTime { get; set; }
}