namespace Splity.Application.Abstractions;

public sealed record ExternalIdentityUser(
    string UserId,
    string Email,
    string? Username,
    string DisplayName,
    bool IsEmailVerified);

public interface IExternalIdentityUserProvider
{
    Task<ExternalIdentityUser> GetUserAsync(string externalUserId, CancellationToken cancellationToken);
}
