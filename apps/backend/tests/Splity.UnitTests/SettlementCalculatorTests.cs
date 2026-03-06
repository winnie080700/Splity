using Splity.Application.Calculations;

namespace Splity.UnitTests;

public sealed class SettlementCalculatorTests
{
    private readonly SettlementCalculator _calculator = new();

    [Fact]
    public void CalculateTransfers_MatchesDebtorsAndCreditorsInDeterministicOrder()
    {
        var a = new Guid("00000000-0000-0000-0000-000000000001");
        var b = new Guid("00000000-0000-0000-0000-000000000002");
        var c = new Guid("00000000-0000-0000-0000-000000000003");
        var d = new Guid("00000000-0000-0000-0000-000000000004");

        var transfers = _calculator.CalculateTransfers(
            new[]
            {
                new NetBalance(a, 50m),
                new NetBalance(b, 10m),
                new NetBalance(c, -30m),
                new NetBalance(d, -30m)
            });

        Assert.Equal(3, transfers.Count);

        Assert.Contains(transfers, x => x.FromParticipantId == c && x.ToParticipantId == a && x.Amount == 30m);
        Assert.Contains(transfers, x => x.FromParticipantId == d && x.ToParticipantId == a && x.Amount == 20m);
        Assert.Contains(transfers, x => x.FromParticipantId == d && x.ToParticipantId == b && x.Amount == 10m);
    }
}
