using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface IParticipantRepository
{
    Task AddAsync(Participant participant, CancellationToken cancellationToken);
    Task<Participant?> GetByIdAsync(Guid participantId, CancellationToken cancellationToken);
    Task<Participant?> GetAsync(Guid groupId, Guid participantId, CancellationToken cancellationToken);
    Task<bool> HasAcceptedInvitationAsync(Guid groupId, Guid userId, CancellationToken cancellationToken);
    Task<bool> HasBillReferencesAsync(Guid participantId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Participant>> ListByGroupAsync(Guid groupId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Participant>> ListPendingInvitationsByUserAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Participant>> ListByIdsAsync(
        Guid groupId,
        IReadOnlyCollection<Guid> participantIds,
        CancellationToken cancellationToken);
    void Remove(Participant participant);
}
