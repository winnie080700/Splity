using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface IGroupRepository
{
    Task AddAsync(Group group, CancellationToken cancellationToken);
    Task<bool> ExistsAsync(Guid groupId, CancellationToken cancellationToken);
}
