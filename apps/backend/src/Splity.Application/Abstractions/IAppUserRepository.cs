using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface IAppUserRepository
{
    Task AddAsync(AppUser user, CancellationToken cancellationToken);
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken);
    Task<AppUser?> GetByIdAsync(Guid userId, CancellationToken cancellationToken);
}
