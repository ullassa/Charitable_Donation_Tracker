using CareFund.Models;

namespace CareFund.Services.Notifications;

public interface INotificationEmailService
{
    Task NotifyUserAsync(User user, string subject, string message, int? donationId = null);
    Task NotifyUsersAsync(IEnumerable<User> users, string subject, string message);
    Task NotifyUserWithAttachmentAsync(User user, string subject, string message, byte[] attachmentBytes, string attachmentFileName, int? donationId = null);
}