using Splity.Application.Models;

namespace Splity.Application.Services;

public interface ISettlementsService
{
    Task<SettlementResultDto> GetAsync(
        Guid groupId,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken);
}
