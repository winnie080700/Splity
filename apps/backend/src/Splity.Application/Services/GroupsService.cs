using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

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
            Status = GroupStatus.Unresolved,
            CreatedAtUtc = DateTime.UtcNow
        };

        await groupRepository.AddAsync(group, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToGroupDto(group);
    }

    public async Task<GroupDto> GetAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new EntityNotFoundException("Group not found.");
        }

        return ToGroupDto(group);
    }

    public async Task<IReadOnlyCollection<GroupSummaryDto>> ListAccessibleAsync(Guid userId, CancellationToken cancellationToken)
    {
        var createdGroups = await groupRepository.ListByCreatorAsync(userId, cancellationToken);
        var invitedGroups = await groupRepository.ListByAcceptedInviteeAsync(userId, cancellationToken);

        var summaries = new Dictionary<Guid, GroupSummaryDto>();
        foreach (var group in createdGroups)
        {
            summaries[group.Id] = new GroupSummaryDto(group.Id, group.Name, group.CreatedAtUtc, ToStatusValue(group.Status), true);
        }

        foreach (var group in invitedGroups)
        {
            if (summaries.ContainsKey(group.Id))
            {
                continue;
            }

            summaries[group.Id] = new GroupSummaryDto(group.Id, group.Name, group.CreatedAtUtc, ToStatusValue(group.Status), false);
        }

        return summaries.Values
            .OrderByDescending(group => group.CreatedAtUtc)
            .ToArray();
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

        return ToGroupDto(group);
    }

    public async Task<GroupDto> UpdateStatusAsync(Guid groupId, UpdateGroupStatusInput input, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetForUpdateAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new EntityNotFoundException("Group not found.");
        }

        group.Status = ParseGroupStatus(input.Status);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToGroupDto(group);
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

    private static GroupDto ToGroupDto(Group group)
    {
        return new GroupDto(group.Id, group.Name, group.CreatedAtUtc, ToStatusValue(group.Status), group.CreatedByUser?.Name, true);
    }

    private static GroupStatus ParseGroupStatus(string? rawStatus)
    {
        return rawStatus?.Trim().ToLowerInvariant() switch
        {
            "unresolved" => GroupStatus.Unresolved,
            "settling" => GroupStatus.Settling,
            "settled" => GroupStatus.Settled,
            _ => throw new DomainValidationException("Unsupported group status.")
        };
    }

    private static string ToStatusValue(GroupStatus status)
    {
        return status switch
        {
            GroupStatus.Unresolved => "unresolved",
            GroupStatus.Settling => "settling",
            GroupStatus.Settled => "settled",
            _ => throw new DomainValidationException("Unsupported group status.")
        };
    }
}
