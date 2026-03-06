using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface IParticipantRepository
{
    Task AddAsync(Participant participant, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Participant>> ListByGroupAsync(Guid groupId, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<Participant>> ListByIdsAsync(
        Guid groupId,
        IReadOnlyCollection<Guid> participantIds,
        CancellationToken cancellationToken);
}
