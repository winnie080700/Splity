using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface ISettlementShareLinkRepository
{
    Task AddAsync(SettlementShareLink shareLink, CancellationToken cancellationToken);
    Task<SettlementShareLink?> GetByShareTokenAsync(string shareToken, CancellationToken cancellationToken);
    Task<bool> ShareTokenExistsAsync(string shareToken, CancellationToken cancellationToken);
}
