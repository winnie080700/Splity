using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Domain.Enums;
using Splity.Infrastructure.Persistence;

namespace Splity.Infrastructure.Repositories;

public sealed class ParticipantRepository(SplityDbContext dbContext) : IParticipantRepository
{
    public Task AddAsync(Participant participant, CancellationToken cancellationToken)
    {
        return dbContext.Participants.AddAsync(participant, cancellationToken).AsTask();
    }

    public Task<Participant?> GetAsync(Guid groupId, Guid participantId, CancellationToken cancellationToken)
    {
        return dbContext.Participants
            .FirstOrDefaultAsync(x => x.GroupId == groupId && x.Id == participantId, cancellationToken);
    }

    public Task<Participant?> GetByIdAsync(Guid participantId, CancellationToken cancellationToken)
    {
        return dbContext.Participants
            .Include(x => x.Group)
            .ThenInclude(x => x!.CreatedByUser)
            .FirstOrDefaultAsync(x => x.Id == participantId, cancellationToken);
    }

    public Task<bool> HasAcceptedInvitationAsync(Guid groupId, Guid userId, CancellationToken cancellationToken)
    {
        return dbContext.Participants
            .AsNoTracking()
            .AnyAsync(
                x => x.GroupId == groupId
                && x.InvitedUserId == userId
                && x.InvitationStatus == ParticipantInvitationStatus.Accepted,
                cancellationToken);
    }

    public async Task<bool> HasBillReferencesAsync(Guid participantId, CancellationToken cancellationToken)
    {
        return await dbContext.BillItemResponsibilities.AnyAsync(x => x.ParticipantId == participantId, cancellationToken)
            || await dbContext.BillShares.AnyAsync(
                x => x.ParticipantId == participantId
                     && (x.TotalShareAmount > 0 || x.PreFeeAmount > 0 || x.FeeAmount > 0),
                cancellationToken)
            || await dbContext.PaymentContributions.AnyAsync(
                x => x.ParticipantId == participantId && x.Amount > 0,
                cancellationToken);
    }

    public async Task<IReadOnlyCollection<Participant>> ListByGroupAsync(Guid groupId, CancellationToken cancellationToken)
    {
        return await dbContext.Participants
            .AsNoTracking()
            .Where(x => x.GroupId == groupId)
            .OrderBy(x => x.Name)
            .ToArrayAsync(cancellationToken);
    }

    public async Task<IReadOnlyCollection<Participant>> ListPendingInvitationsByUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await dbContext.Participants
            .AsNoTracking()
            .Include(x => x.Group)
            .ThenInclude(x => x!.CreatedByUser)
            .Where(x => x.InvitedUserId == userId && x.InvitationStatus == ParticipantInvitationStatus.Pending)
            .OrderByDescending(x => x.CreatedAtUtc)
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

    public void Remove(Participant participant)
    {
        dbContext.Participants.Remove(participant);
    }
}
