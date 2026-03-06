using Splity.Application.Models;

namespace Splity.Application.Services;

public interface IBillsService
{
    Task<BillDetailDto> CreateAsync(Guid groupId, CreateBillInput input, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<BillSummaryDto>> ListAsync(
        Guid groupId,
        string? store,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken);
    Task<BillDetailDto> GetAsync(Guid groupId, Guid billId, CancellationToken cancellationToken);
    Task<BillDetailDto> UpdateAsync(Guid groupId, Guid billId, UpdateBillInput input, CancellationToken cancellationToken);
    Task DeleteAsync(Guid groupId, Guid billId, CancellationToken cancellationToken);
}
