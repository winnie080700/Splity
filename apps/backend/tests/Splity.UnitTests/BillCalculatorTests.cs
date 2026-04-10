using Splity.Application.Calculations;
using Splity.Domain.Enums;

namespace Splity.UnitTests;

public sealed class BillCalculatorTests
{
    private readonly BillCalculator _calculator = new();

    [Fact]
    public void CalculateBillShares_EqualSplitWithSst_DistributesCentsDeterministically()
    {
        var participantA = new Guid("00000000-0000-0000-0000-000000000001");
        var participantB = new Guid("00000000-0000-0000-0000-000000000002");
        var participantC = new Guid("00000000-0000-0000-0000-000000000003");

        var result = _calculator.CalculateBillShares(new BillCalculationInput(
            new[]
            {
                new ParticipantSplitInput(participantA, 1),
                new ParticipantSplitInput(participantB, 1),
                new ParticipantSplitInput(participantC, 1)
            },
            new[] { new BillCalculationItemInput("Groceries", 100m, new[] { participantA, participantB, participantC }) },
            new[] { new BillCalculationFeeInput("SST", FeeType.Percentage, 6m) },
            participantA,
            Array.Empty<BillCalculationContributionInput>()));

        Assert.Equal(100m, result.SubtotalAmount);
        Assert.Equal(6m, result.TotalFeeAmount);
        Assert.Equal(106m, result.GrandTotalAmount);

        var shares = result.Shares.OrderBy(x => x.ParticipantId).ToArray();
        Assert.Equal(35.34m, shares[0].TotalShareAmount);
        Assert.Equal(35.33m, shares[1].TotalShareAmount);
        Assert.Equal(35.33m, shares[2].TotalShareAmount);
        Assert.Equal(106m, shares.Sum(x => x.TotalShareAmount));

        var primaryContribution = Assert.Single(result.Contributions, x => x.Amount > 0);
        Assert.Equal(participantA, primaryContribution.ParticipantId);
        Assert.Equal(106m, primaryContribution.Amount);
    }

    [Fact]
    public void CalculateBillShares_WeightedSplitAndFixedFee_ComputesExpectedShares()
    {
        var participantA = new Guid("00000000-0000-0000-0000-000000000001");
        var participantB = new Guid("00000000-0000-0000-0000-000000000002");

        var result = _calculator.CalculateBillShares(new BillCalculationInput(
            new[]
            {
                new ParticipantSplitInput(participantA, 2),
                new ParticipantSplitInput(participantB, 1)
            },
            new[] { new BillCalculationItemInput("Dinner", 90m, new[] { participantA, participantB }) },
            new[] { new BillCalculationFeeInput("Service", FeeType.Fixed, 9m) },
            participantA,
            new[] { new BillCalculationContributionInput(participantB, 20m) }));

        Assert.Equal(99m, result.GrandTotalAmount);
        Assert.Equal(66m, result.Shares.Single(x => x.ParticipantId == participantA).TotalShareAmount);
        Assert.Equal(33m, result.Shares.Single(x => x.ParticipantId == participantB).TotalShareAmount);

        Assert.Equal(79m, result.Contributions.Single(x => x.ParticipantId == participantA).Amount);
        Assert.Equal(20m, result.Contributions.Single(x => x.ParticipantId == participantB).Amount);
    }
}
