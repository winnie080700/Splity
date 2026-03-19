using Splity.Domain.Enums;

namespace Splity.Application.Calculations;

public sealed record ParticipantSplitInput(Guid ParticipantId, decimal Weight);

public sealed record BillCalculationItemInput(string Description, decimal Amount, IReadOnlyCollection<Guid> ResponsibleParticipantIds);

public sealed record BillCalculationFeeInput(string Name, FeeType FeeType, decimal Value);

public sealed record BillCalculationContributionInput(Guid ParticipantId, decimal Amount);

public sealed record BillCalculationInput(
    IReadOnlyCollection<ParticipantSplitInput> ParticipantSplits,
    IReadOnlyCollection<BillCalculationItemInput> Items,
    IReadOnlyCollection<BillCalculationFeeInput> Fees,
    Guid PrimaryPayerParticipantId,
    IReadOnlyCollection<BillCalculationContributionInput> ExtraContributions);

public sealed record CalculatedShare(
    Guid ParticipantId,
    decimal Weight,
    decimal PreFeeAmount,
    decimal FeeAmount,
    decimal TotalShareAmount);

public sealed record CalculatedContribution(Guid ParticipantId, decimal Amount);

public sealed record CalculatedFee(string Name, FeeType FeeType, decimal Value, decimal AppliedAmount);

public sealed record BillComputationResult(
    decimal SubtotalAmount,
    decimal TotalFeeAmount,
    decimal GrandTotalAmount,
    IReadOnlyCollection<CalculatedFee> AppliedFees,
    IReadOnlyCollection<CalculatedShare> Shares,
    IReadOnlyCollection<CalculatedContribution> Contributions);

public sealed record NetBalance(Guid ParticipantId, decimal NetAmount);

public sealed record SettlementTransfer(Guid FromParticipantId, Guid ToParticipantId, decimal Amount);
