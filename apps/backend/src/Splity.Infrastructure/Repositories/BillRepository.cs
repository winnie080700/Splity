using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Infrastructure.Persistence;

namespace Splity.Infrastructure.Repositories;

public sealed class BillRepository(SplityDbContext dbContext) : IBillRepository
{
    public Task AddAsync(Bill bill, CancellationToken cancellationToken)
    {
        return dbContext.Bills.AddAsync(bill, cancellationToken).AsTask();
    }

    public async Task<Bill?> GetAsync(Guid groupId, Guid billId, CancellationToken cancellationToken)
    {
        return await Query()
            .FirstOrDefaultAsync(x => x.GroupId == groupId && x.Id == billId, cancellationToken);
    }

    public async Task<IReadOnlyCollection<Bill>> ListByGroupAsync(
        Guid groupId,
        string? store,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken)
    {
        var query = Query().Where(x => x.GroupId == groupId);

        if (!string.IsNullOrWhiteSpace(store))
        {
            var normalizedStore = store.Trim().ToLowerInvariant();
            query = query.Where(x => x.StoreName.ToLower() == normalizedStore);
        }

        if (fromDateUtc.HasValue)
        {
            query = query.Where(x => x.TransactionDateUtc >= fromDateUtc.Value);
        }

        if (toDateUtc.HasValue)
        {
            query = query.Where(x => x.TransactionDateUtc <= toDateUtc.Value);
        }

        return await query
            .OrderByDescending(x => x.TransactionDateUtc)
            .ToArrayAsync(cancellationToken);
    }

    public void Remove(Bill bill)
    {
        dbContext.Bills.Remove(bill);
    }

    private IQueryable<Bill> Query()
    {
        return dbContext.Bills
            .Include(x => x.Items)
            .Include(x => x.Fees)
            .Include(x => x.Shares)
            .Include(x => x.Contributions);
    }
}
