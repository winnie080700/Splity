namespace Splity.Application.Abstractions;

public interface IEmailVerificationSender
{
    Task SendVerificationCodeAsync(
        string email,
        string displayName,
        string verificationCode,
        CancellationToken cancellationToken);
}
