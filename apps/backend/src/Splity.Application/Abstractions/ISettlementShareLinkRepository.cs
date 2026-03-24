using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface ISettlementShareLinkRepository
{
    Task AddAsync(SettlementShareLink shareLink, CancellationToken cancellationToken);
    Task<SettlementShareLink?> GetActiveByGroupIdAsync(Guid groupId, CancellationToken cancellationToken);
    Task<SettlementShareLink?> GetActiveByShareTokenAsync(string shareToken, CancellationToken cancellationToken);
    Task<bool> ShareTokenExistsAsync(string shareToken, CancellationToken cancellationToken);
}
