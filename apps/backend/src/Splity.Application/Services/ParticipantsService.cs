using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

namespace Splity.Application.Services;

public sealed class ParticipantsService(
    IGroupRepository groupRepository,
    IAppUserRepository appUserRepository,
    IParticipantRepository participantRepository,
    IUnitOfWork unitOfWork) : IParticipantsService
{
    public async Task<ParticipantDto> CreateAsync(
        Guid groupId,
        CreateParticipantInput input,
        CancellationToken cancellationToken)
    {
        var group = await EnsureGroupEditableAsync(groupId, cancellationToken);

        if (string.IsNullOrWhiteSpace(input.Name))
        {
            throw new DomainValidationException("Participant name is required.");
        }

        var normalizedUsername = NormalizeUsername(input.Username);
        var invitation = await ResolveInvitationStateAsync(
            group,
            normalizedUsername,
            previousInvitedUserId: null,
            previousStatus: null,
            cancellationToken);

        var participant = new Participant
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            Name = input.Name.Trim(),
            Username = normalizedUsername,
            InvitedUserId = invitation.InvitedUserId,
            InvitationStatus = invitation.InvitationStatus,
            CreatedAtUtc = DateTime.UtcNow
        };

        await participantRepository.AddAsync(participant, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToParticipantDto(participant);
    }

    public async Task<IReadOnlyCollection<ParticipantDto>> ListAsync(Guid groupId, CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }

        var participants = await participantRepository.ListByGroupAsync(groupId, cancellationToken);
        return participants
            .OrderBy(x => x.Name)
            .Select(ToParticipantDto)
            .ToArray();
    }

    public async Task<ParticipantDto> UpdateAsync(
        Guid groupId,
        Guid participantId,
        UpdateParticipantInput input,
        CancellationToken cancellationToken)
    {
        var group = await EnsureGroupEditableAsync(groupId, cancellationToken);

        if (string.IsNullOrWhiteSpace(input.Name))
        {
            throw new DomainValidationException("Participant name is required.");
        }

        var participant = await participantRepository.GetAsync(groupId, participantId, cancellationToken);
        if (participant is null)
        {
            throw new EntityNotFoundException("Participant not found.");
        }

        var trimmedName = input.Name.Trim();
        if (trimmedName.StartsWith("@", StringComparison.Ordinal))
        {
            throw new DomainValidationException("Manual participant rename cannot start with '@'. To switch to invited, add @username as a new participant and delete this manual participant.");
        }

        participant.Name = trimmedName;
        var normalizedUsername = NormalizeUsername(input.Username);
        var invitation = await ResolveInvitationStateAsync(
            group,
            normalizedUsername,
            participant.InvitedUserId,
            participant.InvitationStatus,
            cancellationToken);
        participant.Username = normalizedUsername;
        participant.InvitedUserId = invitation.InvitedUserId;
        participant.InvitationStatus = invitation.InvitationStatus;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToParticipantDto(participant);
    }

    public async Task DeleteAsync(Guid groupId, Guid participantId, CancellationToken cancellationToken)
    {
        await EnsureGroupEditableAsync(groupId, cancellationToken);

        var participant = await participantRepository.GetAsync(groupId, participantId, cancellationToken);
        if (participant is null)
        {
            throw new EntityNotFoundException("Participant not found.");
        }

        if (await participantRepository.HasBillReferencesAsync(participantId, cancellationToken))
        {
            throw new DomainValidationException("This participant is still used by one or more bills. Remove the related bills first.");
        }

        participantRepository.Remove(participant);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private async Task<Group> EnsureGroupEditableAsync(Guid groupId, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new EntityNotFoundException("Group not found.");
        }

        if (group.Status != GroupStatus.Unresolved)
        {
            throw new DomainValidationException("This group is locked because settlement has already started.");
        }

        return group;
    }

    private async Task<(Guid? InvitedUserId, ParticipantInvitationStatus InvitationStatus)> ResolveInvitationStateAsync(
        Group group,
        string? normalizedUsername,
        Guid? previousInvitedUserId,
        ParticipantInvitationStatus? previousStatus,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(normalizedUsername))
        {
            return (null, ParticipantInvitationStatus.None);
        }

        var invitedUser = await appUserRepository.GetByUsernameAsync(normalizedUsername, cancellationToken);
        if (invitedUser is null)
        {
            return (null, ParticipantInvitationStatus.None);
        }

        if (group.CreatedByUserId.HasValue && invitedUser.Id == group.CreatedByUserId.Value)
        {
            return (invitedUser.Id, ParticipantInvitationStatus.Accepted);
        }

        var hasSameInvitee = previousInvitedUserId.HasValue && previousInvitedUserId.Value == invitedUser.Id;
        if (hasSameInvitee && previousStatus.HasValue)
        {
            return (invitedUser.Id, previousStatus.Value);
        }

        return (invitedUser.Id, ParticipantInvitationStatus.Pending);
    }

    private static ParticipantDto ToParticipantDto(Participant participant)
    {
        return new ParticipantDto(
            participant.Id,
            participant.GroupId,
            participant.Name,
            participant.Username,
            ToInvitationStatusValue(participant.InvitationStatus),
            participant.CreatedAtUtc);
    }

    private static string ToInvitationStatusValue(ParticipantInvitationStatus status)
    {
        return status switch
        {
            ParticipantInvitationStatus.None => "none",
            ParticipantInvitationStatus.Pending => "pending",
            ParticipantInvitationStatus.Accepted => "accepted",
            ParticipantInvitationStatus.Declined => "declined",
            _ => "none"
        };
    }

    private static string? NormalizeUsername(string? username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return null;
        }

        var normalized = username.Trim();
        while (normalized.StartsWith("@", StringComparison.Ordinal))
        {
            normalized = normalized[1..];
        }

        return normalized.Trim().ToLowerInvariant();
    }
}
