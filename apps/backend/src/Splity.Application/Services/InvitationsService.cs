using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Enums;

namespace Splity.Application.Services;

public sealed class InvitationsService(
    IParticipantRepository participantRepository,
    IUnitOfWork unitOfWork) : IInvitationsService
{
    public async Task<IReadOnlyCollection<InvitationDto>> ListPendingAsync(Guid userId, CancellationToken cancellationToken)
    {
        var invitations = await participantRepository.ListPendingInvitationsByUserAsync(userId, cancellationToken);
        return invitations
            .Select(invitation => new InvitationDto(
                invitation.Id,
                invitation.GroupId,
                invitation.Group?.Name ?? string.Empty,
                invitation.Name,
                invitation.Username,
                invitation.Group?.CreatedByUser?.Name ?? "Group owner",
                invitation.CreatedAtUtc))
            .OrderByDescending(invitation => invitation.InvitedAtUtc)
            .ToArray();
    }

    public async Task AcceptAsync(Guid userId, Guid participantId, CancellationToken cancellationToken)
    {
        await UpdateInvitationStatusAsync(
            userId,
            participantId,
            ParticipantInvitationStatus.Accepted,
            cancellationToken);
    }

    public async Task DeclineAsync(Guid userId, Guid participantId, CancellationToken cancellationToken)
    {
        await UpdateInvitationStatusAsync(
            userId,
            participantId,
            ParticipantInvitationStatus.Declined,
            cancellationToken);
    }

    private async Task UpdateInvitationStatusAsync(
        Guid userId,
        Guid participantId,
        ParticipantInvitationStatus nextStatus,
        CancellationToken cancellationToken)
    {
        var participant = await participantRepository.GetByIdAsync(participantId, cancellationToken);
        if (participant is null)
        {
            throw new EntityNotFoundException("Invitation not found.");
        }

        if (!participant.InvitedUserId.HasValue || participant.InvitedUserId.Value != userId)
        {
            throw new DomainValidationException(
                "Invitation not found.",
                "invitation_not_found");
        }

        if (participant.InvitationStatus != ParticipantInvitationStatus.Pending)
        {
            throw new DomainValidationException(
                "This invitation has already been handled.",
                "invitation_already_handled");
        }

        participant.InvitationStatus = nextStatus;
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
