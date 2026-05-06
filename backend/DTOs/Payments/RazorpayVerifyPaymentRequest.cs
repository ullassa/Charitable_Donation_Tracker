using CareFund.Enums;

namespace CareFund.DTOs.Payments;

public class RazorpayVerifyPaymentRequest
{
    public int CharityRegistrationId { get; set; }
    public decimal Amount { get; set; }
    public bool IsAnonymous { get; set; }
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.UPI;
    public string? Currency { get; set; }
    public string OrderId { get; set; } = string.Empty;
    public string PaymentId { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
}
