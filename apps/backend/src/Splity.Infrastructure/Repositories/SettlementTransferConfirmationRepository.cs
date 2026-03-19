using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Infrastructure.Persistence;

namespace Splity.Infrastructure.Repositories;

public sealed class SettlementTransferConfirmationRepository(SplityDbContext dbContext)
    : ISettlementTransferConfirmationRepository
{
    public Task AddAsync(SettlementTransferConfirmation confirmation, CancellationToken cancellationToken)
    {
        return dbContext.SettlementTransferConfirmations.AddAsync(confirmation, cancellationToken).AsTask();
    }

    public async Task<SettlementTransferConfirmation?> GetByTransferKeyAsync(
        Guid groupId,
        string transferKey,
        CancellationToken cancellationToken)
    {
        return await dbContext.SettlementTransferConfirmations
            .FirstOrDefaultAsync(x => x.GroupId == groupId && x.TransferKey == transferKey, cancellationToken);
    }

    public async Task<IReadOnlyCollection<SettlementTransferConfirmation>> ListByTransferKeysAsync(
        Guid groupId,
        IReadOnlyCollection<string> transferKeys,
        CancellationToken cancellationToken)
    {
        if (transferKeys.Count == 0)
        {
            return Array.Empty<SettlementTransferConfirmation>();
        }

        return await dbContext.SettlementTransferConfirmations
            .Where(x => x.GroupId == groupId && transferKeys.Contains(x.TransferKey))
            .ToArrayAsync(cancellationToken);
    }

    public async Task DeleteByGroupAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var confirmations = await dbContext.SettlementTransferConfirmations
            .Where(x => x.GroupId == groupId)
            .ToArrayAsync(cancellationToken);

        if (confirmations.Length == 0)
        {
            return;
        }

        dbContext.SettlementTransferConfirmations.RemoveRange(confirmations);
    }
}
