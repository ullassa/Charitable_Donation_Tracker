using Microsoft.EntityFrameworkCore;
namespace backend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        // Define your DbSets here, for example:
        // public DbSet<User> Users { get; set; }
    }
}