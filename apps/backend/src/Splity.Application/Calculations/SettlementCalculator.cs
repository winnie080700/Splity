using Splity.Application.Exceptions;

namespace Splity.Application.Calculations;

public sealed class SettlementCalculator : ISettlementCalculator
{
    public IReadOnlyCollection<SettlementTransfer> CalculateTransfers(IReadOnlyCollection<NetBalance> netBalances)
    {
        ArgumentNullException.ThrowIfNull(netBalances);

        var sum = ToCents(netBalances.Sum(x => x.NetAmount));
        if (sum != 0)
        {
            throw new DomainValidationException("Net balances must sum to zero.");
        }

        var creditors = netBalances
            .Select(x => new Outstanding(x.ParticipantId, ToCents(x.NetAmount)))
            .Where(x => x.AmountInCents > 0)
            .OrderByDescending(x => x.AmountInCents)
            .ThenBy(x => x.ParticipantId)
            .ToList();

        var debtors = netBalances
            .Select(x => new Outstanding(x.ParticipantId, ToCents(x.NetAmount)))
            .Where(x => x.AmountInCents < 0)
            .Select(x => new Outstanding(x.ParticipantId, -x.AmountInCents))
            .OrderByDescending(x => x.AmountInCents)
            .ThenBy(x => x.ParticipantId)
            .ToList();

        var transfers = new List<SettlementTransfer>();

        var creditorIndex = 0;
        var debtorIndex = 0;
        while (creditorIndex < creditors.Count && debtorIndex < debtors.Count)
        {
            var creditor = creditors[creditorIndex];
            var debtor = debtors[debtorIndex];

            var amount = Math.Min(creditor.AmountInCents, debtor.AmountInCents);
            if (amount <= 0)
            {
                break;
            }

            transfers.Add(new SettlementTransfer(debtor.ParticipantId, creditor.ParticipantId, amount / 100m));

            creditors[creditorIndex] = creditor with { AmountInCents = creditor.AmountInCents - amount };
            debtors[debtorIndex] = debtor with { AmountInCents = debtor.AmountInCents - amount };

            if (creditors[creditorIndex].AmountInCents == 0)
            {
                creditorIndex++;
            }

            if (debtors[debtorIndex].AmountInCents == 0)
            {
                debtorIndex++;
            }
        }

        return transfers;
    }

    private static int ToCents(decimal amount)
    {
        return (int)Math.Round(amount * 100m, 0, MidpointRounding.AwayFromZero);
    }

    private sealed record Outstanding(Guid ParticipantId, int AmountInCents);
}
