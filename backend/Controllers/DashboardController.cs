using System.Security.Claims;
using System.Text;
using CareFund.Data;
using CareFund.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CareFund.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public DashboardController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("customer/trend")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetCustomerTrend(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string groupBy = "month")
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(userEmail))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == userEmail);
        if (user is null || user.Customer is null)
            return NotFound(new { success = false, message = "Customer profile not found." });

        var normalizedGroupBy = (groupBy ?? "month").Trim().ToLowerInvariant();
        var start = from ?? DateTime.UtcNow.AddMonths(-6);
        var end = to ?? DateTime.UtcNow;

        var donations = await _context.Donations
            .AsNoTracking()
            .Where(d => d.CustomerId == user.Customer.CustomerId && d.DonationDate >= start && d.DonationDate <= end)
            .OrderBy(d => d.DonationDate)
            .ToListAsync();

        var grouped = normalizedGroupBy switch
        {
            "day" => donations
                .GroupBy(d => d.DonationDate.Date)
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    label = g.Key.ToString("yyyy-MM-dd"),
                    amount = g.Sum(x => x.Amount)
                }),
            "week" => donations
                .GroupBy(d => StartOfWeek(d.DonationDate))
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    label = $"{g.Key:yyyy-MM-dd}",
                    amount = g.Sum(x => x.Amount)
                }),
            "year" => donations
                .GroupBy(d => d.DonationDate.Year)
                .OrderBy(g => g.Key)
                .Select(g => new
                {
                    label = g.Key.ToString(),
                    amount = g.Sum(x => x.Amount)
                }),
            _ => donations
                .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
                .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                .Select(g => new
                {
                    label = $"{g.Key.Year}-{g.Key.Month:00}",
                    amount = g.Sum(x => x.Amount)
                })
        };

        return Ok(new
        {
            success = true,
            groupBy = normalizedGroupBy,
            period = new { from = start, to = end },
            items = grouped
        });
    }

    [HttpGet("customer")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetCustomerDashboard([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(userEmail))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == userEmail);
        if (user is null || user.Customer is null)
            return NotFound(new { success = false, message = "Customer profile not found." });

        var start = from ?? DateTime.UtcNow.AddMonths(-6);
        var end = to ?? DateTime.UtcNow;

        var donations = await _context.Donations
            .AsNoTracking()
            .Include(d => d.CharityRegistrationRequest)
            .ThenInclude(c => c.User)
            .Where(d => d.CustomerId == user.Customer.CustomerId && d.DonationDate >= start && d.DonationDate <= end)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();

        var monthly = donations
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                label = $"{g.Key.Year}-{g.Key.Month:00}",
                amount = g.Sum(x => x.Amount)
            });

        return Ok(new
        {
            success = true,
            user = new { user.UserId, user.UserName, user.Email },
            stats = new
            {
                totalDonations = donations.Sum(x => x.Amount),
                donationsCount = donations.Count
            },
            monthly,
            period = new { from = start, to = end },
            recent = donations.Take(10).Select(d => new
            {
                donationId = d.DonationId,
                amount = d.Amount,
                donationDate = d.DonationDate,
                charityId = d.CharityRegistrationId,
                charityName = d.CharityRegistrationRequest != null && d.CharityRegistrationRequest.User != null
                    ? d.CharityRegistrationRequest.User.UserName
                    : string.Empty
            })
        });
    }

    [HttpGet("charity")]
    [Authorize(Roles = "CharityManager")]
    public async Task<IActionResult> GetCharityDashboard([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(userEmail))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        var charity = await _context.Charities
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.UserId == user.UserId && c.IsActive);

        if (charity == null)
            return NotFound(new { success = false, message = "Charity registration not found." });

        var start = from ?? DateTime.UtcNow.AddMonths(-6);
        var end = to ?? DateTime.UtcNow;

        var donations = await _context.Donations
            .AsNoTracking()
            .Where(d => d.CharityRegistrationId == charity.CharityRegistrationId && d.DonationDate >= start && d.DonationDate <= end)
            .OrderByDescending(d => d.DonationDate)
            .ToListAsync();

        var monthly = donations
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                label = $"{g.Key.Year}-{g.Key.Month:00}",
                amount = g.Sum(x => x.Amount)
            });

        return Ok(new
        {
            success = true,
            charity = new
            {
                charity.CharityRegistrationId,
                name = user.UserName,
                charity.Status,
                charity.CauseType,
                charity.City,
                charity.SubmittedAt,
                charity.ReviewedAt,
                charity.AdminComment
            },
            stats = new
            {
                totalCollected = donations.Sum(x => x.Amount),
                donationsCount = donations.Count
            },
            monthly,
            period = new { from = start, to = end },
            recent = donations.Take(10).Select(d => new
            {
                donationId = d.DonationId,
                amount = d.Amount,
                donationDate = d.DonationDate,
                customerId = d.CustomerId
            })
        });
    }

    [HttpGet("customer/report")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> DownloadCustomerReport([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string format = "csv")
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(userEmail))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var user = await _context.Users.Include(u => u.Customer).FirstOrDefaultAsync(u => u.Email == userEmail);
        if (user?.Customer == null)
            return NotFound(new { success = false, message = "Customer profile not found." });

        var start = from ?? DateTime.UtcNow.AddMonths(-3);
        var end = to ?? DateTime.UtcNow;

        var rows = await _context.Donations
            .AsNoTracking()
            .Include(d => d.CharityRegistrationRequest).ThenInclude(c => c.User)
            .Where(d => d.CustomerId == user.Customer.CustomerId && d.DonationDate >= start && d.DonationDate <= end)
            .OrderByDescending(d => d.DonationDate)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.Amount,
                DonorName = user.UserName,
                DonorEmail = user.Email,
                CharityName = d.CharityRegistrationRequest != null && d.CharityRegistrationRequest.User != null
                    ? d.CharityRegistrationRequest.User.UserName
                    : string.Empty
            })
            .ToListAsync();

        if (string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase))
        {
            var pdfLines = new List<string>
            {
                "Thank you for donating",
                $"Donor Name: {user.UserName}",
                $"Donor Email: {user.Email}",
                $"Report Period: {start:yyyy-MM-dd} to {end:yyyy-MM-dd}",
                ""
            };

            foreach (var row in rows)
            {
                pdfLines.Add($"Donation #{row.DonationId} | Date: {row.DonationDate:yyyy-MM-dd} | Amount: {row.Amount} | Charity: {row.CharityName}");
            }

            var pdf = BuildSimplePdf("CareFund Donation Acknowledgement", pdfLines);
            return File(pdf, "application/pdf", $"customer-report-{DateTime.UtcNow:yyyyMMddHHmmss}.pdf");
        }

        var csv = new StringBuilder();
        csv.AppendLine("Thank you for donating");
        csv.AppendLine($"Donor Name,{EscapeCsv(user.UserName)}");
        csv.AppendLine($"Donor Email,{EscapeCsv(user.Email)}");
        csv.AppendLine($"Period From,{start:yyyy-MM-dd}");
        csv.AppendLine($"Period To,{end:yyyy-MM-dd}");
        csv.AppendLine("DonationId,DonationDate,DonorName,DonorEmail,Amount,CharityName");
        foreach (var row in rows)
        {
            csv.AppendLine($"{row.DonationId},{row.DonationDate:yyyy-MM-dd},{EscapeCsv(row.DonorName ?? string.Empty)},{EscapeCsv(row.DonorEmail ?? string.Empty)},{row.Amount},{EscapeCsv(row.CharityName ?? string.Empty)}");
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"customer-report-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    [HttpGet("charity/report")]
    [Authorize(Roles = "CharityManager")]
    public async Task<IActionResult> DownloadCharityReport([FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string format = "csv")
    {
        var userEmail = User.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrWhiteSpace(userEmail))
            return Unauthorized(new { success = false, message = "Invalid token claims." });

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == userEmail);
        if (user == null)
            return NotFound(new { success = false, message = "User not found." });

        var charity = await _context.Charities.FirstOrDefaultAsync(c => c.UserId == user.UserId && c.IsActive);
        if (charity == null)
            return NotFound(new { success = false, message = "Charity registration not found." });

        var start = from ?? DateTime.UtcNow.AddMonths(-3);
        var end = to ?? DateTime.UtcNow;

        var rows = await _context.Donations
            .AsNoTracking()
            .Include(d => d.Customer)
            .ThenInclude(c => c.User)
            .Where(d => d.CharityRegistrationId == charity.CharityRegistrationId && d.DonationDate >= start && d.DonationDate <= end)
            .OrderByDescending(d => d.DonationDate)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.Amount,
                d.CustomerId,
                d.IsAnonymous,
                DonorName = d.IsAnonymous
                    ? "Anonymous"
                    : (d.Customer != null && d.Customer.User != null ? d.Customer.User.UserName : "Unknown"),
                DonorEmail = d.IsAnonymous
                    ? "Hidden"
                    : (d.Customer != null && d.Customer.User != null ? d.Customer.User.Email : string.Empty)
            })
            .ToListAsync();

        if (string.Equals(format, "pdf", StringComparison.OrdinalIgnoreCase))
        {
            var pdfLines = new List<string>
            {
                "Thank you for donating",
                $"Charity Name: {user.UserName}",
                $"Charity Email: {user.Email}",
                $"Report Period: {start:yyyy-MM-dd} to {end:yyyy-MM-dd}",
                ""
            };

            foreach (var row in rows)
            {
                pdfLines.Add($"Donation #{row.DonationId} | Date: {row.DonationDate:yyyy-MM-dd} | Donor: {row.DonorName} | Email: {row.DonorEmail} | Amount: {row.Amount}");
            }

            var pdf = BuildSimplePdf("CareFund Charity Acknowledgement", pdfLines);
            return File(pdf, "application/pdf", $"charity-report-{DateTime.UtcNow:yyyyMMddHHmmss}.pdf");
        }

        var csv = new StringBuilder();
        csv.AppendLine("Thank you for donating");
        csv.AppendLine($"Charity Name,{EscapeCsv(user.UserName)}");
        csv.AppendLine($"Charity Email,{EscapeCsv(user.Email)}");
        csv.AppendLine($"Period From,{start:yyyy-MM-dd}");
        csv.AppendLine($"Period To,{end:yyyy-MM-dd}");
        csv.AppendLine("DonationId,DonationDate,DonorName,DonorEmail,Amount,CustomerId,IsAnonymous,CharityName");
        foreach (var row in rows)
        {
            csv.AppendLine($"{row.DonationId},{row.DonationDate:yyyy-MM-dd},{EscapeCsv(row.DonorName)},{EscapeCsv(row.DonorEmail)},{row.Amount},{row.CustomerId},{row.IsAnonymous},{EscapeCsv(user.UserName)}");
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"charity-report-{DateTime.UtcNow:yyyyMMddHHmmss}.csv");
    }

    private static byte[] BuildSimplePdf(string title, IEnumerable<string> lines)
    {
        var safeTitle = PdfEscape(title);
        var y = 780;
        var content = new StringBuilder();
        content.AppendLine("BT");
        content.AppendLine("/F1 14 Tf");
        content.AppendLine($"40 {y} Td");
        content.AppendLine($"({safeTitle}) Tj");
        content.AppendLine("/F1 10 Tf");

        foreach (var line in lines.Take(45))
        {
            y -= 14;
            content.AppendLine($"0 -14 Td ({PdfEscape(line)}) Tj");
        }

        content.AppendLine("ET");
        var contentBytes = Encoding.ASCII.GetBytes(content.ToString());

        var objects = new List<string>
        {
            "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
            "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
            "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
            "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
            $"5 0 obj\n<< /Length {contentBytes.Length} >>\nstream\n{content}endstream\nendobj\n"
        };

        var pdf = new StringBuilder();
        pdf.Append("%PDF-1.4\n");

        var offsets = new List<int> { 0 };
        foreach (var obj in objects)
        {
            offsets.Add(Encoding.ASCII.GetByteCount(pdf.ToString()));
            pdf.Append(obj);
        }

        var xrefStart = Encoding.ASCII.GetByteCount(pdf.ToString());
        pdf.Append($"xref\n0 {objects.Count + 1}\n");
        pdf.Append("0000000000 65535 f \n");

        for (var i = 1; i <= objects.Count; i++)
        {
            pdf.Append($"{offsets[i]:D10} 00000 n \n");
        }

        pdf.Append("trailer\n");
        pdf.Append($"<< /Size {objects.Count + 1} /Root 1 0 R >>\n");
        pdf.Append("startxref\n");
        pdf.Append($"{xrefStart}\n");
        pdf.Append("%%EOF");

        return Encoding.ASCII.GetBytes(pdf.ToString());
    }

    private static string PdfEscape(string value)
    {
        return (value ?? string.Empty)
            .Replace("\\", "\\\\")
            .Replace("(", "\\(")
            .Replace(")", "\\)");
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }

    private static DateTime StartOfWeek(DateTime value)
    {
        var date = value.Date;
        var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
        return date.AddDays(-diff);
    }
}
