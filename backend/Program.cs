
var builder = WebApplication.CreateBuilder(args);

// API controllers (return JSON)
builder.Services.AddControllers();

// Swagger (easy API testing)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

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

app.Run();