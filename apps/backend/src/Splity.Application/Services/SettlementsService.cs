using Splity.Application.Abstractions;
using Splity.Application.Calculations;
using Splity.Application.Exceptions;
using Splity.Application.Models;

namespace Splity.Application.Services;

public sealed class SettlementsService(
    IGroupRepository groupRepository,
    IParticipantRepository participantRepository,
    IBillRepository billRepository,
    ISettlementCalculator settlementCalculator) : ISettlementsService
{
    public async Task<SettlementResultDto> GetAsync(
        Guid groupId,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }

        var participants = await participantRepository.ListByGroupAsync(groupId, cancellationToken);
        var bills = await billRepository.ListByGroupAsync(groupId, null, fromDateUtc, toDateUtc, cancellationToken);

        var running = participants.ToDictionary(x => x.Id, _ => 0m);

        foreach (var bill in bills)
        {
            foreach (var share in bill.Shares)
            {
                if (!running.ContainsKey(share.ParticipantId))
                {
                    continue;
                }

                running[share.ParticipantId] = RoundToCurrency(running[share.ParticipantId] - share.TotalShareAmount);
            }

            foreach (var contribution in bill.Contributions)
            {
                if (!running.ContainsKey(contribution.ParticipantId))
                {
                    continue;
                }

                running[contribution.ParticipantId] = RoundToCurrency(running[contribution.ParticipantId] + contribution.Amount);
            }
        }

        var netBalances = running
            .Select(x => new NetBalance(x.Key, x.Value))
            .ToArray();

        var transfers = settlementCalculator.CalculateTransfers(netBalances)
            .Select(x => new SettlementTransferDto(x.FromParticipantId, x.ToParticipantId, x.Amount))
            .ToArray();

        var participantLookup = participants.ToDictionary(x => x.Id, x => x.Name);
        var balanceDtos = netBalances
            .OrderByDescending(x => x.NetAmount)
            .ThenBy(x => participantLookup.TryGetValue(x.ParticipantId, out var name) ? name : x.ParticipantId.ToString())
            .Select(x => new ParticipantNetBalanceDto(
                x.ParticipantId,
                participantLookup.TryGetValue(x.ParticipantId, out var name) ? name : "Unknown",
                x.NetAmount))
            .ToArray();

        return new SettlementResultDto(
            groupId,
            fromDateUtc,
            toDateUtc,
            balanceDtos,
            transfers);
    }

    private static decimal RoundToCurrency(decimal amount)
    {
        return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
    }
}
