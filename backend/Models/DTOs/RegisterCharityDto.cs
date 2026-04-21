public class RegisterCharityDto
{
    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string CharityName { get; set; } = string.Empty;
    public string? RegistrationId { get; set; }
    public string? CauseType { get; set; }
    public string? City { get; set; }
    public string? State { get; set; }
    public string? Country { get; set; }
    public string? AddressLine { get; set; }
    public string? Pincode { get; set; }
    public string? ManagerName { get; set; }
    public string? ManagerPhone { get; set; }
    public string? SocialMediaLink { get; set; }
    public List<string>? WebsiteLinks { get; set; }
    public List<string>? ImageUrls { get; set; }
    public string? Mission { get; set; }
    public string? About { get; set; }
    public string? Activities { get; set; }
}