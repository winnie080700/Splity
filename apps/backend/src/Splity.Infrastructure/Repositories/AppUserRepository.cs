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

    public Task<AppUser?> GetByClerkUserIdAsync(string clerkUserId, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers
            .FirstOrDefaultAsync(x => x.ClerkUserId == clerkUserId, cancellationToken);
    }

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);
    }

    public Task<AppUser?> GetByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers
            .FirstOrDefaultAsync(x => x.Username == username, cancellationToken);
    }

    public Task<AppUser?> GetByIdAsync(Guid userId, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    }

    public Task<AppUser?> GetByIdForUpdateAsync(Guid userId, CancellationToken cancellationToken)
    {
        return dbContext.AppUsers
            .FirstOrDefaultAsync(x => x.Id == userId, cancellationToken);
    }
}
