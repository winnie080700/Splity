using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;

namespace Splity.Application.Services;

public sealed class GroupsService(
    IGroupRepository groupRepository,
    IAppUserRepository appUserRepository,
    ISettlementTransferConfirmationRepository confirmationRepository,
    IUnitOfWork unitOfWork) : IGroupsService
{
    public async Task<GroupDto> CreateAsync(CreateGroupInput input, Guid? creatorUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
        {
            throw new DomainValidationException("Group name is required.");
        }

        if (creatorUserId.HasValue && await appUserRepository.GetByIdAsync(creatorUserId.Value, cancellationToken) is null)
        {
            throw new EntityNotFoundException("Creator user not found.");
        }

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = input.Name.Trim(),
            CreatedByUserId = creatorUserId,
            CreatedAtUtc = DateTime.UtcNow
        };

        await groupRepository.AddAsync(group, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new GroupDto(group.Id, group.Name, group.CreatedAtUtc, group.CreatedByUser?.Name);
    }

    public async Task<GroupDto> GetAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new EntityNotFoundException("Group not found.");
        }

        return new GroupDto(group.Id, group.Name, group.CreatedAtUtc, group.CreatedByUser?.Name);
    }

    public async Task<GroupDto> UpdateAsync(Guid groupId, UpdateGroupInput input, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
        {
            throw new DomainValidationException("Group name is required.");
        }

        var group = await groupRepository.GetForUpdateAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new EntityNotFoundException("Group not found.");
        }

        group.Name = input.Name.Trim();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new GroupDto(group.Id, group.Name, group.CreatedAtUtc, group.CreatedByUser?.Name);
    }

    public async Task DeleteAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetForUpdateAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new EntityNotFoundException("Group not found.");
        }

        await confirmationRepository.DeleteByGroupAsync(groupId, cancellationToken);
        groupRepository.Remove(group);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
