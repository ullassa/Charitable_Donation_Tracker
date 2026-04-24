using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CareFund.Models
{
    public class FavoriteCharity
    {
        [Key]
        public int FavoriteCharityId { get; set; }

        [Required]
        public int CustomerId { get; set; }

        [Required]
        public int CharityRegistrationId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [ForeignKey("CustomerId")]
        public Customer? Customer { get; set; }

        [ForeignKey("CharityRegistrationId")]
        public CharityRegistrationRequest? Charity { get; set; }
    }
}
