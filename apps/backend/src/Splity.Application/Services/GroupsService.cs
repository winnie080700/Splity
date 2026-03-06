using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;

namespace Splity.Application.Services;

public sealed class GroupsService(IGroupRepository groupRepository, IUnitOfWork unitOfWork) : IGroupsService
{
    public async Task<GroupDto> CreateAsync(CreateGroupInput input, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
        {
            throw new DomainValidationException("Group name is required.");
        }

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = input.Name.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await groupRepository.AddAsync(group, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new GroupDto(group.Id, group.Name, group.CreatedAtUtc);
    }
}
