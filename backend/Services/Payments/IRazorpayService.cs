using CareFund.Services.Payments.Models;

namespace CareFund.Services.Payments;

public interface IRazorpayService
{
    string KeyId { get; }
    string MerchantName { get; }
    string Description { get; }
    string DefaultCurrency { get; }
    Task<RazorpayOrderResult> CreateOrderAsync(decimal amount, string currency, string receipt);
    Task<RazorpayOrderResult> FetchOrderAsync(string orderId);
    bool VerifySignature(string orderId, string paymentId, string signature);
}
