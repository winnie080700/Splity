using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;

namespace Splity.Application.Services;

public sealed class ParticipantsService(
    IGroupRepository groupRepository,
    IParticipantRepository participantRepository,
    IUnitOfWork unitOfWork) : IParticipantsService
{
    public async Task<ParticipantDto> CreateAsync(
        Guid groupId,
        CreateParticipantInput input,
        CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }

        if (string.IsNullOrWhiteSpace(input.Name))
        {
            throw new DomainValidationException("Participant name is required.");
        }

        var participant = new Participant
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            Name = input.Name.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        await participantRepository.AddAsync(participant, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new ParticipantDto(participant.Id, participant.GroupId, participant.Name, participant.CreatedAtUtc);
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
            .Select(x => new ParticipantDto(x.Id, x.GroupId, x.Name, x.CreatedAtUtc))
            .ToArray();
    }

    public async Task<ParticipantDto> UpdateAsync(
        Guid groupId,
        Guid participantId,
        UpdateParticipantInput input,
        CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }

        if (string.IsNullOrWhiteSpace(input.Name))
        {
            throw new DomainValidationException("Participant name is required.");
        }

        var participant = await participantRepository.GetAsync(groupId, participantId, cancellationToken);
        if (participant is null)
        {
            throw new EntityNotFoundException("Participant not found.");
        }

        participant.Name = input.Name.Trim();
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return new ParticipantDto(participant.Id, participant.GroupId, participant.Name, participant.CreatedAtUtc);
    }

    public async Task DeleteAsync(Guid groupId, Guid participantId, CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }

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
}
