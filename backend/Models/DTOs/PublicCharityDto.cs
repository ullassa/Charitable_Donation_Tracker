namespace CareFund.DTOs.Charity
{
    public class PublicCharityDto
    {
        public int CharityId { get; set; }
        public string CharityName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Cause { get; set; }
        public string? Location { get; set; }
        public string? RegistrationId { get; set; }
        public string? Mission { get; set; }
        public string? About { get; set; }
        public string? Activities { get; set; }
        public string? AddressLine { get; set; }
        public string? ManagerName { get; set; }
        public string? ManagerPhone { get; set; }
        public string? Pincode { get; set; }
        public string? State { get; set; }
        public string? Icon { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string Status { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }
}