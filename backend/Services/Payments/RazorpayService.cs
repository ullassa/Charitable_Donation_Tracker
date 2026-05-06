using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CareFund.Services.Payments.Models;
using Microsoft.Extensions.Options;

namespace CareFund.Services.Payments;

public class RazorpayService : IRazorpayService
{
    private readonly RazorpayOptions _options;
    private readonly HttpClient _httpClient;

    public RazorpayService(IOptions<RazorpayOptions> options, IHttpClientFactory httpClientFactory)
    {
        _options = options.Value;

        if (string.IsNullOrWhiteSpace(_options.KeyId) || string.IsNullOrWhiteSpace(_options.KeySecret))
            throw new InvalidOperationException("Razorpay KeyId/KeySecret are missing from configuration.");

        _httpClient = httpClientFactory.CreateClient();
        _httpClient.BaseAddress = new Uri("https://api.razorpay.com/");
        var credentials = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{_options.KeyId}:{_options.KeySecret}"));
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
    }

    public string KeyId => _options.KeyId;
    public string MerchantName => _options.MerchantName;
    public string Description => _options.Description;
    public string DefaultCurrency => _options.Currency;

    public async Task<RazorpayOrderResult> CreateOrderAsync(decimal amount, string currency, string receipt)
    {
        var paise = ToPaise(amount);
        var payload = new
        {
            amount = paise,
            currency,
            receipt,
            payment_capture = 1
        };

        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync("v1/orders", content);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return BuildOrderResult(json);
    }

    public async Task<RazorpayOrderResult> FetchOrderAsync(string orderId)
    {
        using var response = await _httpClient.GetAsync($"v1/orders/{orderId}");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return BuildOrderResult(json);
    }

    public async Task<RazorpayPaymentLinkResult> CreatePaymentLinkAsync(decimal amount, string currency, string receipt, string description, string userEmail, string userPhone, string successUrl, string cancelUrl)
    {
        var paise = ToPaise(amount);
        var payload = new
        {
            amount = paise,
            currency,
            accept_partial = true,
            first_min_partial_amount = Math.Max(100, paise / 2),
            description,
            reference_id = receipt,
            customer = new
            {
                email = userEmail,
                contact = userPhone
            },
            notify = new
            {
                sms = true,
                email = true
            },
            reminder_enable = true,
            notes = new
            {
                policy_name = "CareFund Donation",
                receipt_id = receipt
            },
            callback_url = successUrl,
            callback_method = "get"
        };

        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync("v1/payment_links", content);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return BuildPaymentLinkResult(json);
    }

    public bool VerifySignature(string orderId, string paymentId, string signature)
    {
        if (string.IsNullOrWhiteSpace(signature))
            return false;

        var payload = string.Concat(orderId, "|", paymentId);
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.KeySecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var computed = BitConverter.ToString(hash).Replace("-", string.Empty).ToLowerInvariant();
        return string.Equals(computed, signature, StringComparison.OrdinalIgnoreCase);
    }

    private static RazorpayOrderResult BuildOrderResult(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var orderId = root.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? string.Empty : string.Empty;
        var amount = root.TryGetProperty("amount", out var amountProp) ? amountProp.GetInt64() : 0;
        var currency = root.TryGetProperty("currency", out var currencyProp) ? currencyProp.GetString() ?? "INR" : "INR";
        var status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() ?? "created" : "created";
        return new RazorpayOrderResult(orderId, amount, currency, status);
    }

    private static RazorpayPaymentLinkResult BuildPaymentLinkResult(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var linkId = root.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? string.Empty : string.Empty;
        var shortUrl = root.TryGetProperty("short_url", out var urlProp) ? urlProp.GetString() ?? string.Empty : string.Empty;
        var amount = root.TryGetProperty("amount", out var amountProp) ? amountProp.GetInt64() : 0;
        var currency = root.TryGetProperty("currency", out var currencyProp) ? currencyProp.GetString() ?? "INR" : "INR";
        var status = root.TryGetProperty("status", out var statusProp) ? statusProp.GetString() ?? "created" : "created";
        return new RazorpayPaymentLinkResult(linkId, shortUrl, amount, currency, status);
    }

    private static long ToPaise(decimal amount)
    {
        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount), "Amount must be greater than 0.");

        return (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero);
    }
}
