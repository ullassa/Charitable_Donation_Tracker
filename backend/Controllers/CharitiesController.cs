using CareFund.Data;
using CareFund.DTOs.Charity;
using CareFund.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CharitiesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CharitiesController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("public")]
        public async Task<IActionResult> GetPublicCharities([FromQuery] string? keyword = null, [FromQuery] string? cause = null)
        {
            var charities = await _context.Charities
                .AsNoTracking()
                .Include(c => c.User)
                .Include(c => c.Images)
                .Include(c => c.Donations)
                .Where(c => c.Status == CharityStatus.Approved && c.IsActive)
                .Where(c => c.User != null)
                .Where(c => string.IsNullOrWhiteSpace(keyword)
                    || (c.User != null && c.User.UserName.Contains(keyword))
                    || (c.RegistrationId != null && c.RegistrationId.Contains(keyword))
                    || c.City.Contains(keyword))
                .Where(c => string.IsNullOrWhiteSpace(cause)
                    || c.CauseType.ToString().Contains(cause))
                .OrderByDescending(c => c.SubmittedAt)
                .Select(c => new PublicCharityDto
                {
                    CharityId = c.CharityRegistrationId,
                    CharityName = c.User != null ? c.User.UserName : string.Empty,
                    Description = c.About,
                    Cause = c.CauseType.ToString(),
                    Location = c.City,
                    PhoneNumber = c.ManagerPhone,
                    Email = c.User != null ? c.User.Email : string.Empty,
                    Status = c.Status.ToString(),
                    IsActive = c.IsActive,
                    RegistrationId = c.RegistrationId,
                    Mission = c.Mission,
                    About = c.About,
                    Activities = c.Activities,
                    AddressLine = c.AddressLine,
                    ManagerName = c.ManagerName,
                    ManagerPhone = c.ManagerPhone,
                    Pincode = c.Pincode,
                    State = c.IndianState.ToString(),
                    Icon = c.CauseType.ToString(),
                    TargetAmount = c.TargetAmount,
                    TotalReceived = c.Donations != null ? c.Donations.Sum(d => d.Amount) : 0,
                    DonorsCount = c.Donations != null ? c.Donations.Select(d => d.CustomerId).Distinct().Count() : 0,
                    ImageUrls = c.Images
                        .Where(i => i.ImageUrl != null)
                        .Select(i => i.ImageUrl!)
                        .Distinct()
                        .ToList()
                })
                .ToListAsync();

            foreach (var charity in charities)
            {
                charity.RemainingAmount = charity.TargetAmount > charity.TotalReceived
                    ? charity.TargetAmount - charity.TotalReceived
                    : 0;

                charity.ProgressPercent = charity.TargetAmount > 0
                    ? (charity.TotalReceived / charity.TargetAmount) * 100
                    : 0;
            }

            return Ok(new { success = true, items = charities });
        }

        [HttpGet("/api/charity/{id:int}")]
        public async Task<IActionResult> GetPublicCharityById(int id)
        {
            var charity = await _context.Charities
                .AsNoTracking()
                .Include(c => c.User)
                .Include(c => c.Images)
                .Include(c => c.Donations)
                .Where(c => c.CharityRegistrationId == id && c.Status == CharityStatus.Approved && c.IsActive)
                .Where(c => c.User != null)
                .Select(c => new PublicCharityDto
                {
                    CharityId = c.CharityRegistrationId,
                    CharityName = c.User != null ? c.User.UserName : string.Empty,
                    Description = c.About,
                    Cause = c.CauseType.ToString(),
                    Location = c.City,
                    PhoneNumber = c.ManagerPhone,
                    Email = c.User != null ? c.User.Email : string.Empty,
                    Status = c.Status.ToString(),
                    IsActive = c.IsActive,
                    RegistrationId = c.RegistrationId,
                    Mission = c.Mission,
                    About = c.About,
                    Activities = c.Activities,
                    AddressLine = c.AddressLine,
                    ManagerName = c.ManagerName,
                    ManagerPhone = c.ManagerPhone,
                    Pincode = c.Pincode,
                    State = c.IndianState.ToString(),
                    Icon = c.CauseType.ToString(),
                    TargetAmount = c.TargetAmount,
                    TotalReceived = c.Donations != null ? c.Donations.Sum(d => d.Amount) : 0,
                    DonorsCount = c.Donations != null ? c.Donations.Select(d => d.CustomerId).Distinct().Count() : 0,
                    SocialMediaLink = c.SocialMediaLink,
                    ImageUrls = c.Images
                        .Where(i => i.ImageUrl != null)
                        .Select(i => i.ImageUrl!)
                        .Distinct()
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (charity == null)
                return NotFound(new { success = false, message = "Charity not found." });

            charity.RemainingAmount = charity.TargetAmount > charity.TotalReceived
                ? charity.TargetAmount - charity.TotalReceived
                : 0;

            charity.ProgressPercent = charity.TargetAmount > 0
                ? (charity.TotalReceived / charity.TargetAmount) * 100
                : 0;

            return Ok(new { success = true, item = charity });
        }
    }
}