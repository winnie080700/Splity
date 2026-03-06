using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Infrastructure.Persistence;

namespace Splity.Infrastructure.Repositories;

public sealed class ParticipantRepository(SplityDbContext dbContext) : IParticipantRepository
{
    public Task AddAsync(Participant participant, CancellationToken cancellationToken)
    {
        return dbContext.Participants.AddAsync(participant, cancellationToken).AsTask();
    }

    public async Task<IReadOnlyCollection<Participant>> ListByGroupAsync(Guid groupId, CancellationToken cancellationToken)
    {
        return await dbContext.Participants
            .AsNoTracking()
            .Where(x => x.GroupId == groupId)
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Participant>> ListByIdsAsync(
        Guid groupId,
        IReadOnlyCollection<Guid> participantIds,
        CancellationToken cancellationToken)
    {
        if (participantIds.Count == 0)
        {
            return Array.Empty<Participant>();
        }

        return await dbContext.Participants
            .AsNoTracking()
            .Where(x => x.GroupId == groupId && participantIds.Contains(x.Id))
            .ToArrayAsync(cancellationToken);
    }
}
