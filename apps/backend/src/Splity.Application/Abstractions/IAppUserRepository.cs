using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface IAppUserRepository
{
    Task AddAsync(AppUser user, CancellationToken cancellationToken);
    Task<AppUser?> GetByClerkUserIdAsync(string clerkUserId, CancellationToken cancellationToken);
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken);
    Task<AppUser?> GetByUsernameAsync(string username, CancellationToken cancellationToken);
    Task<AppUser?> GetByIdAsync(Guid userId, CancellationToken cancellationToken);
    Task<AppUser?> GetByIdForUpdateAsync(Guid userId, CancellationToken cancellationToken);
}
