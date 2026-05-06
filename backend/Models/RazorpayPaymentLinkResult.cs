namespace CareFund.Models
{
    public class RazorpayPaymentLinkResult
    {
        public string LinkId { get; set; }
        public string ShortUrl { get; set; }
        public long Amount { get; set; }
        public string Currency { get; set; }
        public string Status { get; set; }

        public RazorpayPaymentLinkResult(string linkId, string shortUrl, long amount, string currency, string status)
        {
            LinkId = linkId;
            ShortUrl = shortUrl;
            Amount = amount;
            Currency = currency;
            Status = status;
        }
    }
}