using Splity.Application.Abstractions;
using Splity.Application.Calculations;
using Splity.Application.Models;
using Splity.Application.Services;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

namespace Splity.IntegrationTests;

public sealed class BillToSettlementFlowTests
{
    [Fact]
    public async Task CreateBill_ThenComputeSettlement_ReturnsExpectedTransfers()
    {
        var groupRepository = new InMemoryGroupRepository();
        var participantRepository = new InMemoryParticipantRepository();
        var billRepository = new InMemoryBillRepository();
        var unitOfWork = new InMemoryUnitOfWork();

        var groupsService = new GroupsService(groupRepository, unitOfWork);
        var participantsService = new ParticipantsService(groupRepository, participantRepository, unitOfWork);
        var billsService = new BillsService(
            groupRepository,
            participantRepository,
            billRepository,
            new BillCalculator(),
            unitOfWork);
        var settlementsService = new SettlementsService(
            groupRepository,
            participantRepository,
            billRepository,
            new SettlementCalculator());

        var group = await groupsService.CreateAsync(new CreateGroupInput("Trip"), CancellationToken.None);
        var alice = await participantsService.CreateAsync(group.Id, new CreateParticipantInput("Alice"), CancellationToken.None);
        var bob = await participantsService.CreateAsync(group.Id, new CreateParticipantInput("Bob"), CancellationToken.None);
        var charlie = await participantsService.CreateAsync(group.Id, new CreateParticipantInput("Charlie"), CancellationToken.None);

        await billsService.CreateAsync(group.Id, new CreateBillInput(
            "GrocerX",
            DateTime.UtcNow,
            SplitMode.Equal,
            alice.Id,
            new[] { new BillItemInput("Groceries", 100m) },
            new[] { new BillFeeInput("SST", FeeType.Percentage, 6m) },
            new[]
            {
                new BillParticipantInput(alice.Id, null),
                new BillParticipantInput(bob.Id, null),
                new BillParticipantInput(charlie.Id, null)
            },
            Array.Empty<BillContributionInput>()), CancellationToken.None);

        var settlement = await settlementsService.GetAsync(group.Id, null, null, CancellationToken.None);

        Assert.Equal(3, settlement.NetBalances.Count);
        Assert.Equal(2, settlement.Transfers.Count);
        Assert.All(settlement.Transfers, transfer => Assert.Equal(alice.Id, transfer.ToParticipantId));
        Assert.Contains(settlement.Transfers, x => x.FromParticipantId == bob.Id);
        Assert.Contains(settlement.Transfers, x => x.FromParticipantId == charlie.Id);
        Assert.Equal(70.67m, settlement.Transfers.Sum(x => x.Amount));
        Assert.Contains(settlement.Transfers, x => x.Amount == 35.34m);
        Assert.Contains(settlement.Transfers, x => x.Amount == 35.33m);
    }

    private sealed class InMemoryGroupRepository : IGroupRepository
    {
        private readonly Dictionary<Guid, Group> _groups = new();

        public Task AddAsync(Group group, CancellationToken cancellationToken)
        {
            _groups[group.Id] = group;
            return Task.CompletedTask;
        }

        public Task<bool> ExistsAsync(Guid groupId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_groups.ContainsKey(groupId));
        }
    }

    private sealed class InMemoryParticipantRepository : IParticipantRepository
    {
        private readonly List<Participant> _participants = new();

        public Task AddAsync(Participant participant, CancellationToken cancellationToken)
        {
            _participants.Add(participant);
            return Task.CompletedTask;
        }

        public Task<IReadOnlyCollection<Participant>> ListByGroupAsync(Guid groupId, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<Participant>>(_participants.Where(x => x.GroupId == groupId).ToArray());
        }

        public Task<IReadOnlyCollection<Participant>> ListByIdsAsync(
            Guid groupId,
            IReadOnlyCollection<Guid> participantIds,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<Participant>>(_participants
                .Where(x => x.GroupId == groupId && participantIds.Contains(x.Id))
                .ToArray());
        }
    }

    private sealed class InMemoryBillRepository : IBillRepository
    {
        private readonly List<Bill> _bills = new();

        public Task AddAsync(Bill bill, CancellationToken cancellationToken)
        {
            _bills.Add(bill);
            return Task.CompletedTask;
        }

        public Task<Bill?> GetAsync(Guid groupId, Guid billId, CancellationToken cancellationToken)
        {
            return Task.FromResult(_bills.FirstOrDefault(x => x.GroupId == groupId && x.Id == billId));
        }

        public Task<IReadOnlyCollection<Bill>> ListByGroupAsync(
            Guid groupId,
            string? store,
            DateTime? fromDateUtc,
            DateTime? toDateUtc,
            CancellationToken cancellationToken)
        {
            var query = _bills.Where(x => x.GroupId == groupId);

            if (!string.IsNullOrWhiteSpace(store))
            {
                query = query.Where(x => string.Equals(x.StoreName, store, StringComparison.OrdinalIgnoreCase));
            }

            if (fromDateUtc.HasValue)
            {
                query = query.Where(x => x.TransactionDateUtc >= fromDateUtc.Value);
            }

            if (toDateUtc.HasValue)
            {
                query = query.Where(x => x.TransactionDateUtc <= toDateUtc.Value);
            }

            return Task.FromResult<IReadOnlyCollection<Bill>>(query.ToArray());
        }

        public void Remove(Bill bill)
        {
            _bills.Remove(bill);
        }
    }

    private sealed class InMemoryUnitOfWork : IUnitOfWork
    {
        public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(0);
        }
    }
}
