using Splity.Application.Models;

namespace Splity.Application.Services;

public interface IParticipantsService
{
    Task<ParticipantDto> CreateAsync(Guid groupId, CreateParticipantInput input, CancellationToken cancellationToken);
    Task<IReadOnlyCollection<ParticipantDto>> ListAsync(Guid groupId, CancellationToken cancellationToken);
    Task<ParticipantDto> UpdateAsync(Guid groupId, Guid participantId, UpdateParticipantInput input, CancellationToken cancellationToken);
    Task DeleteAsync(Guid groupId, Guid participantId, CancellationToken cancellationToken);
}
