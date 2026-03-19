using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface ISettlementTransferConfirmationRepository
{
    Task AddAsync(SettlementTransferConfirmation confirmation, CancellationToken cancellationToken);
    Task<SettlementTransferConfirmation?> GetByTransferKeyAsync(Guid groupId, string transferKey, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<SettlementTransferConfirmation>> ListByTransferKeysAsync(
        Guid groupId,
        IReadOnlyCollection<string> transferKeys,
        CancellationToken cancellationToken);
    Task DeleteByGroupAsync(Guid groupId, CancellationToken cancellationToken);
}
