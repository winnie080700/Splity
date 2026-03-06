using Splity.Application.Models;

namespace Splity.Application.Services;

public interface IGroupsService
{
    Task<GroupDto> CreateAsync(CreateGroupInput input, CancellationToken cancellationToken);
}
