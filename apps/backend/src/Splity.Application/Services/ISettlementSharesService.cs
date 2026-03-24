using Splity.Application.Models;

namespace Splity.Application.Services;

public interface ISettlementSharesService
{
    Task<SettlementShareRecordDto?> GetActiveAsync(Guid groupId, CancellationToken cancellationToken);
    Task<SettlementShareRecordDto> CreateAsync(Guid groupId, CreateSettlementShareInput input, CancellationToken cancellationToken);
    Task<SettlementSharePublicDto> GetByTokenAsync(string shareToken, CancellationToken cancellationToken);
}
