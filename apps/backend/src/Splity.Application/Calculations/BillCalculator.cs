using Splity.Application.Exceptions;
using Splity.Domain.Enums;

namespace Splity.Application.Calculations;

public sealed class BillCalculator : IBillCalculator
{
    public BillComputationResult CalculateBillShares(BillCalculationInput input)
    {
        ArgumentNullException.ThrowIfNull(input);

        if (input.ParticipantSplits.Count == 0)
        {
            throw new DomainValidationException("At least one participant is required.");
        }

        if (input.Items.Count == 0)
        {
            throw new DomainValidationException("At least one bill item is required.");
        }

        if (!input.ParticipantSplits.Any(x => x.ParticipantId == input.PrimaryPayerParticipantId))
        {
            throw new DomainValidationException("Primary payer must be part of bill participants.");
        }

        foreach (var item in input.Items)
        {
            if (string.IsNullOrWhiteSpace(item.Description))
            {
                throw new DomainValidationException("Bill item description is required.");
            }

            if (item.Amount <= 0)
            {
                throw new DomainValidationException("Bill item amount must be greater than zero.");
            }

            var responsibleParticipantIds = item.ResponsibleParticipantIds
                .Distinct()
                .ToArray();

            if (responsibleParticipantIds.Length == 0)
            {
                throw new DomainValidationException("Each bill item must have at least one responsible participant.");
            }

            if (responsibleParticipantIds.Length != item.ResponsibleParticipantIds.Count)
            {
                throw new DomainValidationException("Duplicate responsible participants are not allowed for a bill item.");
            }

            if (responsibleParticipantIds.Any(participantId => input.ParticipantSplits.All(x => x.ParticipantId != participantId)))
            {
                throw new DomainValidationException("Responsible item participants must be part of bill participants.");
            }
        }

        foreach (var split in input.ParticipantSplits)
        {
            if (split.Weight <= 0)
            {
                throw new DomainValidationException("Participant weight must be greater than zero.");
            }
        }

        foreach (var fee in input.Fees)
        {
            if (string.IsNullOrWhiteSpace(fee.Name))
            {
                throw new DomainValidationException("Fee name is required.");
            }

            if (fee.Value < 0)
            {
                throw new DomainValidationException("Fee value must be zero or greater.");
            }
        }

        var subtotal = RoundToCurrency(input.Items.Sum(x => x.Amount));
        var appliedFees = CalculateAppliedFees(subtotal, input.Fees);
        var totalFee = RoundToCurrency(appliedFees.Sum(x => x.AppliedAmount));
        var grandTotal = RoundToCurrency(subtotal + totalFee);

        var participantWeights = input.ParticipantSplits.ToDictionary(x => x.ParticipantId, x => x.Weight);
        var preFeeAllocations = input.ParticipantSplits.ToDictionary(x => x.ParticipantId, _ => 0m);

        foreach (var item in input.Items)
        {
            var responsibleWeights = item.ResponsibleParticipantIds
                .Distinct()
                .ToDictionary(participantId => participantId, participantId => participantWeights[participantId]);

            foreach (var allocation in AllocateByWeight(item.Amount, responsibleWeights))
            {
                preFeeAllocations[allocation.Key] = RoundToCurrency(preFeeAllocations[allocation.Key] + allocation.Value);
            }
        }

        Dictionary<Guid, decimal> feeAllocations;
        if (totalFee == 0)
        {
            feeAllocations = input.ParticipantSplits.ToDictionary(x => x.ParticipantId, _ => 0m);
        }
        else if (subtotal > 0)
        {
            feeAllocations = AllocateByWeight(totalFee, preFeeAllocations.ToDictionary(x => x.Key, x => x.Value));
        }
        else
        {
            feeAllocations = AllocateByWeight(
                totalFee,
                input.ParticipantSplits.ToDictionary(x => x.ParticipantId, x => x.Weight));
        }

        var shares = input.ParticipantSplits
            .OrderBy(x => x.ParticipantId)
            .Select(x =>
            {
                var preFeeAmount = preFeeAllocations[x.ParticipantId];
                var feeAmount = feeAllocations[x.ParticipantId];
                return new CalculatedShare(
                    x.ParticipantId,
                    x.Weight,
                    preFeeAmount,
                    feeAmount,
                    RoundToCurrency(preFeeAmount + feeAmount));
            })
            .ToArray();

        var contributionMap = BuildContributionMap(input, grandTotal);
        var contributions = contributionMap
            .OrderBy(x => x.Key)
            .Select(x => new CalculatedContribution(x.Key, x.Value))
            .ToArray();

        return new BillComputationResult(
            subtotal,
            totalFee,
            grandTotal,
            appliedFees,
            shares,
            contributions);
    }

    private static IReadOnlyCollection<CalculatedFee> CalculateAppliedFees(
        decimal subtotal,
        IReadOnlyCollection<BillCalculationFeeInput> fees)
    {
        return fees.Select(fee =>
            {
                var appliedAmount = fee.FeeType switch
                {
                    FeeType.Percentage => RoundToCurrency(subtotal * (fee.Value / 100m)),
                    FeeType.Fixed => RoundToCurrency(fee.Value),
                    _ => throw new DomainValidationException("Unsupported fee type.")
                };

                return new CalculatedFee(fee.Name, fee.FeeType, fee.Value, appliedAmount);
            })
            .ToArray();
    }

    private static Dictionary<Guid, decimal> BuildContributionMap(BillCalculationInput input, decimal grandTotal)
    {
        var contributionMap = input.ParticipantSplits.ToDictionary(x => x.ParticipantId, _ => 0m);

        foreach (var contribution in input.ExtraContributions)
        {
            if (!contributionMap.ContainsKey(contribution.ParticipantId))
            {
                throw new DomainValidationException("Contribution participant must be part of bill participants.");
            }

            if (contribution.Amount < 0)
            {
                throw new DomainValidationException("Contribution amount must be zero or greater.");
            }

            contributionMap[contribution.ParticipantId] += RoundToCurrency(contribution.Amount);
        }

        var extraTotal = RoundToCurrency(contributionMap.Sum(x => x.Value));
        if (extraTotal > grandTotal)
        {
            throw new DomainValidationException("Contribution total cannot exceed bill grand total.");
        }

        var remaining = RoundToCurrency(grandTotal - extraTotal);
        contributionMap[input.PrimaryPayerParticipantId] += remaining;
        contributionMap[input.PrimaryPayerParticipantId] = RoundToCurrency(contributionMap[input.PrimaryPayerParticipantId]);

        var contributionTotal = RoundToCurrency(contributionMap.Sum(x => x.Value));
        if (contributionTotal != grandTotal)
        {
            throw new DomainValidationException("Contribution total must equal bill grand total.");
        }

        return contributionMap;
    }

    private static Dictionary<Guid, decimal> AllocateByWeight(decimal totalAmount, Dictionary<Guid, decimal> weights)
    {
        var roundedTotal = RoundToCurrency(totalAmount);
        var totalCents = ToCents(roundedTotal);
        var totalWeight = weights.Sum(x => x.Value);
        if (totalWeight <= 0)
        {
            throw new DomainValidationException("Total weight must be greater than zero.");
        }

        var allocations = new Dictionary<Guid, int>();
        var remainders = new List<(Guid ParticipantId, decimal Remainder)>();
        var allocatedCents = 0;

        foreach (var weight in weights)
        {
            var exactCents = (decimal)totalCents * weight.Value / totalWeight;
            var floorCents = (int)Math.Floor(exactCents);
            allocations[weight.Key] = floorCents;
            allocatedCents += floorCents;
            remainders.Add((weight.Key, exactCents - floorCents));
        }

        var centsToDistribute = totalCents - allocatedCents;
        foreach (var participantId in remainders
                     .OrderByDescending(x => x.Remainder)
                     .ThenBy(x => x.ParticipantId)
                     .Take(centsToDistribute)
                     .Select(x => x.ParticipantId))
        {
            allocations[participantId] += 1;
        }

        return allocations.ToDictionary(x => x.Key, x => x.Value / 100m);
    }

    private static int ToCents(decimal amount)
    {
        return (int)Math.Round(amount * 100m, 0, MidpointRounding.AwayFromZero);
    }

    private static decimal RoundToCurrency(decimal amount)
    {
        return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
    }
}
