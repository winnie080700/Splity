using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface IGroupRepository
{
    Task AddAsync(Group group, CancellationToken cancellationToken);
    Task<bool> ExistsAsync(Guid groupId, CancellationToken cancellationToken);
    Task<bool> IsCreatorAsync(Guid groupId, Guid userId, CancellationToken cancellationToken);
    Task<Group?> GetAsync(Guid groupId, CancellationToken cancellationToken);
    Task<Group?> GetForUpdateAsync(Guid groupId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Group>> ListByCreatorAsync(Guid creatorUserId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Group>> ListByAcceptedInviteeAsync(Guid invitedUserId, CancellationToken cancellationToken);
    void Remove(Group group);
}
