using Microsoft.AspNetCore.Mvc;

namespace CareFund.Controllers
{
    [ApiController]
    [Route("api/uploads")]
    public class UploadsController : ControllerBase
    {
        private readonly IWebHostEnvironment _environment;

        public UploadsController(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        [HttpPost("charity-images")]
        [RequestSizeLimit(30_000_000)]
        public async Task<IActionResult> UploadCharityImages([FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(new { success = false, message = "At least one image file is required." });
            }

            if (files.Count < 5)
            {
                return BadRequest(new { success = false, message = "Please upload at least 5 charity images." });
            }

            var allowedExtensions = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                ".jpg",
                ".jpeg",
                ".png"
            };

            const long maxFileSize = 5 * 1024 * 1024;
            var webRoot = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadRoot = Path.Combine(webRoot, "uploads", "charities");
            Directory.CreateDirectory(uploadRoot);

            var imageUrls = new List<string>();

            foreach (var file in files)
            {
                if (file == null || file.Length == 0)
                {
                    continue;
                }

                if (file.Length > maxFileSize)
                {
                    return BadRequest(new { success = false, message = "Each image must be 5MB or smaller." });
                }

                var extension = Path.GetExtension(file.FileName);
                if (string.IsNullOrWhiteSpace(extension) || !allowedExtensions.Contains(extension))
                {
                    return BadRequest(new { success = false, message = "Only JPG and PNG images are allowed." });
                }

                var fileName = $"{Guid.NewGuid()}{extension.ToLowerInvariant()}";
                var filePath = Path.Combine(uploadRoot, fileName);

                await using var stream = new FileStream(filePath, FileMode.Create);
                await file.CopyToAsync(stream);

                imageUrls.Add($"/uploads/charities/{fileName}");
            }

            if (imageUrls.Count < 5)
            {
                return BadRequest(new { success = false, message = "Please upload at least 5 valid images." });
            }

            return Ok(new { success = true, imageUrls });
        }
    }
}
