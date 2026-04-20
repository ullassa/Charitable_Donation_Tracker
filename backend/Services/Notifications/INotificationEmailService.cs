using CareFund.Models;

namespace CareFund.Services.Notifications;

public interface INotificationEmailService
{
    Task NotifyUserAsync(User user, string subject, string message, int? donationId = null);
    Task NotifyUsersAsync(IEnumerable<User> users, string subject, string message);
}