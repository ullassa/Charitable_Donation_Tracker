using Microsoft.EntityFrameworkCore;

using CareFund.Models;
 
namespace CareFund.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
            
        }
 
        // Tables
        public DbSet<User> Users { get; set; }
        public DbSet<CharityRegistrationRequest> Charities { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Donation> Donations { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<CharityImage> CharityImage { get; set; }
        public DbSet<Otp> OTPs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<OtpVerification> OtpVerifications { get; set; }
        public DbSet<Feedback> Feedbacks { get; set; }
        public DbSet<FavoriteCharity> FavoriteCharities { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
 
        // Relationships 
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            foreach (var relationship in modelBuilder.Model.GetEntityTypes()
        .SelectMany(e => e.GetForeignKeys()))
    {
        relationship.DeleteBehavior = DeleteBehavior.Restrict;
    }
 
            // User - Customer (1:1)
            modelBuilder.Entity<User>()
                .HasOne(u => u.Customer)
                .WithOne(c => c.User)
                .HasForeignKey<Customer>(c => c.UserId);
 
            // User - Charity (1:M)
            modelBuilder.Entity<User>()
                .HasMany(u => u.CharityRegistrationRequests)
                .WithOne(c => c.User)
                .HasForeignKey(c => c.UserId);
 
            // Customer - Donation (1:M)
            modelBuilder.Entity<Customer>()
                .HasMany(c => c.Donations)
                .WithOne(d => d.Customer)
                .HasForeignKey(d => d.CustomerId);
 
            // Charity - Donation (1:M)
            modelBuilder.Entity<CharityRegistrationRequest>()
                .HasMany(c => c.Donations)
                .WithOne(d => d.CharityRegistrationRequest)
                .HasForeignKey(d => d.CharityRegistrationId);
 
            // Donation - Payment (1:1)
            modelBuilder.Entity<Donation>()
                .HasOne(d => d.Payment)
                .WithOne(p => p.Donation)
                .HasForeignKey<Donation>(d => d.PaymentId);

            // Donation amount precision
            modelBuilder.Entity<Donation>()
                .Property(d => d.Amount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<CharityRegistrationRequest>()
                .Property(c => c.TargetAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Feedback>()
                .Property(f => f.Amount)
                .HasPrecision(18, 2);

            // Payment amount precision
            modelBuilder.Entity<Payment>()
                .Property(p => p.Amount)
                .HasPrecision(18, 2);
 
            // User - OTP (1:M)
            modelBuilder.Entity<User>()
                .HasMany(u => u.Otps)
                .WithOne(o => o.User)
                .HasForeignKey(o => o.UserId);
 
            // User - Notification (1:M)
            modelBuilder.Entity<User>()
                .HasMany(u => u.Notifications)
                .WithOne(n => n.User)
                .HasForeignKey(n => n.UserId);
 
            // Donation - Notification (1:M)
            modelBuilder.Entity<Donation>()
                .HasMany(d => d.Notifications)
                .WithOne(n => n.Donation)
                .HasForeignKey(n => n.DonationId);

            modelBuilder.Entity<FavoriteCharity>()
                .HasIndex(f => new { f.CustomerId, f.CharityRegistrationId })
                .IsUnique();

            modelBuilder.Entity<FavoriteCharity>()
                .HasOne(f => f.Customer)
                .WithMany()
                .HasForeignKey(f => f.CustomerId);

            modelBuilder.Entity<FavoriteCharity>()
                .HasOne(f => f.Charity)
                .WithMany()
                .HasForeignKey(f => f.CharityRegistrationId);

            modelBuilder.Entity<AuditLog>()
                .HasIndex(a => a.Timestamp);

            modelBuilder.Entity<AuditLog>()
                .HasIndex(a => a.UserId);
        }
    
    }
}