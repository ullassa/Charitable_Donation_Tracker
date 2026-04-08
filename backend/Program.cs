using CareFund.Data;
using Microsoft.EntityFrameworkCore;
using CareFund.Models;
using CareFund.Enums;

var builder = WebApplication.CreateBuilder(args);

// API controllers (return JSON)
builder.Services.AddControllers();

// Swagger (easy API testing)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

//db context

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))); // In-memory for testing; switch to SQL Server in production);
 

// Allow Angular to call the API (CORS)
builder.Services.AddCors(options =>
{
    options.AddPolicy("Angular", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod());
});


var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();

app.UseCors("Angular");

// later (when you add login/JWT): app.UseAuthentication();
app.UseAuthorization();

// Enables attribute-routed controllers like /api/charities
app.MapControllers();




 using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
 
if (!db.Users.Any())
{
    db.Users.AddRange(
        new User
        {
            UserName = "Ullas",
            Email = "ullas@gmail.com",
            PhoneNumber = "9999999999",
            // UserRole = UserRole.Admin,
            PasswordHash = "123456",
            CreatedAt = DateTime.UtcNow
        },
        new User
        {
            UserName = "Ravi",
            Email = "ravi@gmail.com",
            PhoneNumber = "8888888888",
            // UserRole = UserRole.User,
            PasswordHash = "123456",
            CreatedAt = DateTime.UtcNow
        }
    );

}

 
    db.SaveChanges();
}
 
app.Run();