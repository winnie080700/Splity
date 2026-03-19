using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Infrastructure.Persistence;

namespace Splity.Infrastructure.Repositories;

public sealed class AppUserRepository(SplityDbContext dbContext) : IAppUserRepository
{
    public Task AddAsync(AppUser user, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers.AddAsync(user, cancellationToken).AsTask();
    }

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public Task<AppUser?> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    }
}
