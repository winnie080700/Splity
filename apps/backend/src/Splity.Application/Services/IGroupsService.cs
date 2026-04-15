using Splity.Application.Models;

namespace Splity.Application.Services;

public interface IGroupsService
{
    Task<GroupDto> CreateAsync(CreateGroupInput input, Guid? creatorUserId, CancellationToken cancellationToken);
    Task<GroupDto> GetAsync(Guid groupId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<GroupSummaryDto>> ListAccessibleAsync(Guid userId, CancellationToken cancellationToken);
    Task<GroupDto> UpdateAsync(Guid groupId, UpdateGroupInput input, CancellationToken cancellationToken);
    Task<GroupDto> UpdateStatusAsync(Guid groupId, UpdateGroupStatusInput input, CancellationToken cancellationToken);
    Task DeleteAsync(Guid groupId, CancellationToken cancellationToken);
}
