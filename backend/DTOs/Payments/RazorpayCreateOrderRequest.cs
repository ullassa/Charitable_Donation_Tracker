namespace CareFund.DTOs.Payments;

public class RazorpayCreateOrderRequest
{
    public int CharityRegistrationId { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
}
