using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Infrastructure.Persistence;

namespace Splity.Infrastructure.Repositories;

public sealed class SettlementShareLinkRepository(SplityDbContext dbContext) : ISettlementShareLinkRepository
{
    public Task AddAsync(SettlementShareLink shareLink, CancellationToken cancellationToken)
    {
        return dbContext.SettlementShareLinks.AddAsync(shareLink, cancellationToken).AsTask();
    }

    public Task<SettlementShareLink?> GetActiveByGroupIdAsync(Guid groupId, CancellationToken cancellationToken)
    {
        return dbContext.SettlementShareLinks
            .Where(x => x.GroupId == groupId && x.IsActive)
            .OrderByDescending(x => x.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<SettlementShareLink?> GetActiveByShareTokenAsync(string shareToken, CancellationToken cancellationToken)
    {
        return dbContext.SettlementShareLinks
            .FirstOrDefaultAsync(x => x.ShareToken == shareToken && x.IsActive, cancellationToken);
    }

    public Task<bool> ShareTokenExistsAsync(string shareToken, CancellationToken cancellationToken)
    {
        return dbContext.SettlementShareLinks.AnyAsync(x => x.ShareToken == shareToken, cancellationToken);
    }
}
