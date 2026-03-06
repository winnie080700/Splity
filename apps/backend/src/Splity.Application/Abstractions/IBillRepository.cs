using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface IBillRepository
{
    Task AddAsync(Bill bill, CancellationToken cancellationToken);
    Task<Bill?> GetAsync(Guid groupId, Guid billId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Bill>> ListByGroupAsync(
        Guid groupId,
        string? store,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken);
    void Remove(Bill bill);
}
