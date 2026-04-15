using Splity.Application.Models;

namespace Splity.Application.Services;

public interface IInvitationsService
{
    Task<IReadOnlyCollection<InvitationDto>> ListPendingAsync(Guid userId, CancellationToken cancellationToken);
    Task AcceptAsync(Guid userId, Guid participantId, CancellationToken cancellationToken);
    Task DeclineAsync(Guid userId, Guid participantId, CancellationToken cancellationToken);
}
