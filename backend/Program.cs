using CareFund.Data;
using CareFund.Services.Auth;
using CareFund.Services.Jwt;
using CareFund.Services.Otp;
using DotNetEnv;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;

var envCandidates = new[]
{
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(AppContext.BaseDirectory, ".env"),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", ".env")),
    Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", ".env"))
};

var envPath = envCandidates.FirstOrDefault(File.Exists);
if (!string.IsNullOrWhiteSpace(envPath))
{
    Env.Load(envPath);
}

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();
builder.Services.AddHttpClient();

// Register custom services
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "CareFund API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer <your_token>"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// DB Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("DefaultConnection is missing. Check backend/.env or appsettings.json.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// JWT Auth
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
    throw new InvalidOperationException("Jwt:Key is missing in configuration.");

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

// Seed default admin user
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var schemaReady = false;

    try
    {
        db.Database.Migrate();
        schemaReady = true;
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Database migration skipped during startup. Continuing without migration.");
    }

    if (!schemaReady)
    {
        try
        {
            _ = db.Users.AsNoTracking().Select(u => u.UserId).Take(1).Any();
            schemaReady = true;
        }
        catch (SqlException ex) when (ex.Number == 208)
        {
            app.Logger.LogWarning(ex, "Users table is missing. Attempting database bootstrap via EnsureCreated().");

            try
            {
                db.Database.EnsureCreated();
                _ = db.Users.AsNoTracking().Select(u => u.UserId).Take(1).Any();
                schemaReady = true;
                app.Logger.LogInformation("Database schema bootstrap completed successfully.");
            }
            catch (Exception bootstrapEx)
            {
                app.Logger.LogError(bootstrapEx, "Database bootstrap failed. Ensure the login has CREATE/ALTER permissions in CareFundDb.");
            }
        }
    }

    try
    {
        if (!db.Database.CanConnect())
        {
            app.Logger.LogWarning("Database is currently unreachable. Skipping startup admin seeding.");
        }
        else if (!schemaReady)
        {
            app.Logger.LogWarning("Database schema is not ready. Skipping startup admin seeding.");
        }
        else
        {
        db.Database.ExecuteSqlRaw(@"
IF EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_Users_PhoneNumber' AND object_id = OBJECT_ID('dbo.Users')
)
BEGIN
    DROP INDEX [IX_Users_PhoneNumber] ON [dbo].[Users];
END");

        var adminExists = db.Users.Any(u => u.Email == "admin@carefund.com" && u.UserRole == CareFund.Enums.UserRole.Admin);

        if (!adminExists)
        {
            var adminUser = new CareFund.Models.User
            {
                UserName = "Admin",
                Email = "admin@carefund.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                UserRole = CareFund.Enums.UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            db.Users.Add(adminUser);
            db.SaveChanges();
        }
        else
        {
            var existingAdmin = db.Users.First(u => u.Email == "admin@carefund.com" && u.UserRole == CareFund.Enums.UserRole.Admin);
            if (string.IsNullOrWhiteSpace(existingAdmin.PasswordHash) || !existingAdmin.PasswordHash.StartsWith("$2"))
            {
                existingAdmin.PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123");
                db.SaveChanges();
            }
        }
        }
    }
    catch (SqlException ex) when (ex.Number == 4060)
    {
        app.Logger.LogError(ex, "Database login succeeded but access to the target database failed. Ensure the database exists and this login has access.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database unavailable during startup admin seeding. Check SQL Server instance and connection string.");
    }
}

// Swagger
app.UseSwagger();
app.UseSwaggerUI();

// For local dev, avoid forced redirect issues between Angular http and API https
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowAngular");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();