using System.ComponentModel.DataAnnotations;
// using CareFund.Enums;
 namespace CareFund.Models
 {
    public class LoginRequest
    {
        [Required]
        public string Email { get; set; } = string.Empty;
 
        [Required]
        public string PasswordHash { get; set; } = string.Empty;
    }
 }
    