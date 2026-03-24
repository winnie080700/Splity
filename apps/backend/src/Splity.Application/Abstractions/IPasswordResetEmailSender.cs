namespace Splity.Application.Abstractions;

public interface IPasswordResetEmailSender
{
    Task SendTemporaryPasswordAsync(
        string email,
        string displayName,
        string temporaryPassword,
        CancellationToken cancellationToken);
}
