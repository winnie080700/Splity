using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Infrastructure.Persistence;

namespace Splity.Infrastructure.Repositories;

public sealed class GroupRepository(SplityDbContext dbContext) : IGroupRepository
{
    public Task AddAsync(Group group, CancellationToken cancellationToken)
    {
        return dbContext.Groups.AddAsync(group, cancellationToken).AsTask();
    }

    public Task<bool> ExistsAsync(Guid groupId, CancellationToken cancellationToken)
    {
        return dbContext.Groups.AnyAsync(x => x.Id == groupId, cancellationToken);
    }

    public Task<Group?> GetAsync(Guid groupId, CancellationToken cancellationToken)
    {
        return dbContext.Groups
            .AsNoTracking()
            .Include(x => x.CreatedByUser)
            .FirstOrDefaultAsync(x => x.Id == groupId, cancellationToken);
    }

    public Task<Group?> GetForUpdateAsync(Guid groupId, CancellationToken cancellationToken)
    {
        return dbContext.Groups
            .Include(x => x.CreatedByUser)
            .FirstOrDefaultAsync(x => x.Id == groupId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Group>> ListByCreatorAsync(Guid creatorUserId, CancellationToken cancellationToken)
    {
        return await dbContext.Groups
            .AsNoTracking()
            .Where(x => x.CreatedByUserId == creatorUserId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToArrayAsync(cancellationToken);
    }

    public void Remove(Group group)
    {
        dbContext.Groups.Remove(group);
    }
}
