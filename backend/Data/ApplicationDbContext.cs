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
        public DbSet<Charity> Charities { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Donation> Donations { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<OTP> OTPs { get; set; }
        public DbSet<Notification> Notifications { get; set; }
 
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
                .HasMany(u => u.Charities)
                .WithOne(c => c.User)
                .HasForeignKey(c => c.UserId);
 
            // Customer - Donation (1:M)
            modelBuilder.Entity<Customer>()
                .HasMany(c => c.Donations)
                .WithOne(d => d.Customer)
                .HasForeignKey(d => d.CustomerId);
 
            // Charity - Donation (1:M)
            modelBuilder.Entity<Charity>()
                .HasMany(c => c.Donations)
                .WithOne(d => d.Charity)
                .HasForeignKey(d => d.CharityId);
 
            // Donation - Payment (1:M)
            modelBuilder.Entity<Donation>()
                .HasMany(d => d.Payments)
                .WithOne(p => p.Donation)
                .HasForeignKey(p => p.DonationId);
 
            // User - OTP (1:M)
            modelBuilder.Entity<User>()
                .HasMany(u => u.OTPs)
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
        }
    
    }
}