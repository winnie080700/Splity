using Splity.Application.Abstractions;
using Splity.Application.Exceptions;

namespace Splity.Application.Services;

public sealed class GroupAccessService(
    IGroupRepository groupRepository,
    IParticipantRepository participantRepository) : IGroupAccessService
{
    public async Task<GroupAccessResult> EnsureCanViewAsync(Guid groupId, Guid userId, CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }

        if (await groupRepository.IsCreatorAsync(groupId, userId, cancellationToken))
        {
            return new GroupAccessResult(true);
        }

        if (await participantRepository.HasAcceptedInvitationAsync(groupId, userId, cancellationToken))
        {
            return new GroupAccessResult(false);
        }

        throw new DomainValidationException(
            "You do not have access to this group.",
            "group_access_denied");
    }

    public async Task EnsureCanEditAsync(Guid groupId, Guid userId, CancellationToken cancellationToken)
    {
        var access = await EnsureCanViewAsync(groupId, userId, cancellationToken);
        if (access.CanEdit)
        {
            return;
        }

        throw new DomainValidationException(
            "This group is read-only for your account.",
            "group_read_only");
    }
}
