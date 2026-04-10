using Splity.Application.Abstractions;

namespace Splity.Application.Services;

public interface IAppUserIdentityService
{
    Task<Guid> ResolveUserIdAsync(string externalUserId, CancellationToken cancellationToken, bool refreshProfile = false);
    Task<Guid?> TryResolveUserIdAsync(string? externalUserId, CancellationToken cancellationToken);
    Task<Guid> SyncUserProfileAsync(ExternalIdentityUser externalUser, CancellationToken cancellationToken);
}
