namespace CareFund.Services.Payments.Models;

public class RazorpayOrderResult
{
    public RazorpayOrderResult(string orderId, long amount, string currency, string status)
    {
        OrderId = orderId;
        Amount = amount;
        Currency = currency;
        Status = status;
    }

    public string OrderId { get; }
    public long Amount { get; }
    public string Currency { get; }
    public string Status { get; }
}
