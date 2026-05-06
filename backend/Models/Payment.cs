using System.ComponentModel.DataAnnotations; 

using CareFund.Enums; 

  

namespace CareFund.Models 

{ 

    public class Payment 

    { 

        [Key] 

        public int PaymentId { get; set; } 

  

        [Required] 

        public PaymentMethod PaymentMethod { get; set; } 

  

        [StringLength(200)] 

        public string? TransactionReference { get; set; } 

        
        [StringLength(200)] 

        public string? TransactionId { get; set; }

        
        public decimal Amount { get; set; }

        
        [StringLength(10)] 

        public string Currency { get; set; } = "INR";

        
        [StringLength(50)] 

        public string Status { get; set; } = "Completed";

        
        [StringLength(100)] 

        public string? GatewayName { get; set; }

        
        [StringLength(500)] 

        public string? Notes { get; set; }

  

        public DateTime PaymentDate { get; set; } = DateTime.UtcNow; 

  

        public Donation? Donation { get; set; } 

    } 

} 