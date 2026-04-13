using CareFund.Models;

namespace CareFund.Services.Jwt
{
    /// <summary>
    /// Interface for JWT token generation and validation
    /// </summary>
    public interface IJwtService
    {
        /// <summary>
        /// Generates JWT token for authenticated user
        /// </summary>
        string GenerateToken(User user);
    }
}
