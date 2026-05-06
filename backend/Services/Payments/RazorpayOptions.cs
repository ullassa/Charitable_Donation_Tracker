namespace CareFund.Services.Payments;

public class RazorpayOptions
{
    public string KeyId { get; set; } = string.Empty;
    public string KeySecret { get; set; } = string.Empty;
    public string Mode { get; set; } = "test";
    public string Currency { get; set; } = "INR";
    public string MerchantName { get; set; } = "CareFund";
    public string Description { get; set; } = "Charity Donation";
}
