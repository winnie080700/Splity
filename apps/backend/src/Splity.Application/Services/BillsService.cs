using Splity.Application.Abstractions;
using Splity.Application.Calculations;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

namespace Splity.Application.Services;

public sealed class BillsService(
    IGroupRepository groupRepository,
    IParticipantRepository participantRepository,
    IBillRepository billRepository,
    ISettlementTransferConfirmationRepository confirmationRepository,
    IBillCalculator billCalculator,
    IUnitOfWork unitOfWork) : IBillsService
{
    public async Task<BillDetailDto> CreateAsync(Guid groupId, CreateBillInput input, CancellationToken cancellationToken)
    {
        await EnsureGroupEditable(groupId, cancellationToken);
        ValidateBillInput(input.StoreName);

        var participants = await GetAndValidateBillParticipants(groupId, input.Participants, input.PrimaryPayerParticipantId, cancellationToken);
        var computation = ComputeBill(input.SplitMode, input.Participants, input.Items, input.Fees, input.PrimaryPayerParticipantId, input.ExtraContributions);

        var bill = BuildNewBill(groupId, input, computation);
        await billRepository.AddAsync(bill, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToBillDetailDto(bill, participants, computation);
    }

    public async Task<IReadOnlyCollection<BillSummaryDto>> ListAsync(
        Guid groupId,
        string? store,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken)
    {
        await EnsureGroupExists(groupId, cancellationToken);

        var bills = await billRepository.ListByGroupAsync(groupId, store, fromDateUtc, toDateUtc, cancellationToken);
        return bills
            .OrderByDescending(x => x.TransactionDateUtc)
            .ThenBy(x => x.StoreName)
            .Select(x => new BillSummaryDto(
                x.Id,
                x.GroupId,
                x.StoreName,
                x.TransactionDateUtc,
                x.SplitMode,
                RoundToCurrency(x.Items.Sum(i => i.Amount)),
                RoundToCurrency(CalculateAppliedFeeTotal(x.Items, x.Fees)),
                RoundToCurrency(x.Shares.Sum(s => s.TotalShareAmount))))
            .ToArray();
    }

    public async Task<BillDetailDto> GetAsync(Guid groupId, Guid billId, CancellationToken cancellationToken)
    {
        await EnsureGroupExists(groupId, cancellationToken);
        var bill = await GetBillEntity(groupId, billId, cancellationToken);

        var participantIds = bill.Shares.Select(x => x.ParticipantId)
            .Concat(bill.Contributions.Select(x => x.ParticipantId))
            .Concat(bill.Items.SelectMany(x => x.Responsibilities.Select(responsibility => responsibility.ParticipantId)))
            .Distinct()
            .ToArray();

        var participants = await participantRepository.ListByIdsAsync(groupId, participantIds, cancellationToken);
        var participantLookup = participants.ToDictionary(x => x.Id, x => x);

        return ToBillDetailDto(bill, participantLookup, BuildComputationFromBill(bill));
    }

    public async Task<BillDetailDto> UpdateAsync(
        Guid groupId,
        Guid billId,
        UpdateBillInput input,
        CancellationToken cancellationToken)
    {
        await EnsureGroupEditable(groupId, cancellationToken);
        var bill = await GetBillEntity(groupId, billId, cancellationToken);
        ValidateBillInput(input.StoreName);

        var participants = await GetAndValidateBillParticipants(groupId, input.Participants, input.PrimaryPayerParticipantId, cancellationToken);
        var computation = ComputeBill(input.SplitMode, input.Participants, input.Items, input.Fees, input.PrimaryPayerParticipantId, input.ExtraContributions);

        UpdateBillEntity(bill, input, computation);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToBillDetailDto(bill, participants, computation);
    }

    public async Task DeleteAsync(Guid groupId, Guid billId, CancellationToken cancellationToken)
    {
        await EnsureGroupEditable(groupId, cancellationToken);
        var bill = await GetBillEntity(groupId, billId, cancellationToken);

        await confirmationRepository.DeleteByGroupAsync(groupId, cancellationToken);
        billRepository.Remove(bill);
        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    private BillComputationResult ComputeBill(
        SplitMode splitMode,
        IReadOnlyCollection<BillParticipantInput> participants,
        IReadOnlyCollection<BillItemInput> items,
        IReadOnlyCollection<BillFeeInput> fees,
        Guid primaryPayerParticipantId,
        IReadOnlyCollection<BillContributionInput> extraContributions)
    {
        var splitInputs = BuildSplitInputs(splitMode, participants);
        return billCalculator.CalculateBillShares(new BillCalculationInput(
            splitInputs,
            items.Select(x => new BillCalculationItemInput(x.Description, x.Amount, x.ResponsibleParticipantIds)).ToArray(),
            fees.Select(x => new BillCalculationFeeInput(x.Name, x.FeeType, x.Value)).ToArray(),
            primaryPayerParticipantId,
            extraContributions.Select(x => new BillCalculationContributionInput(x.ParticipantId, x.Amount)).ToArray()));
    }

    private static IReadOnlyCollection<ParticipantSplitInput> BuildSplitInputs(
        SplitMode splitMode,
        IReadOnlyCollection<BillParticipantInput> participants)
    {
        if (participants.Count == 0)
        {
            throw new DomainValidationException("At least one participant is required.");
        }

        var seen = new HashSet<Guid>();
        var splitInputs = new List<ParticipantSplitInput>(participants.Count);
        foreach (var participant in participants.OrderBy(x => x.ParticipantId))
        {
            if (!seen.Add(participant.ParticipantId))
            {
                throw new DomainValidationException("Duplicate participants are not allowed.");
            }

            var weight = splitMode switch
            {
                SplitMode.Equal => 1m,
                SplitMode.Weighted => participant.Weight ?? 0m,
                _ => throw new DomainValidationException("Unsupported split mode.")
            };

            if (weight <= 0)
            {
                throw new DomainValidationException("Weighted split requires each participant weight to be greater than zero.");
            }

            splitInputs.Add(new ParticipantSplitInput(participant.ParticipantId, weight));
        }

        return splitInputs;
    }

    private static Bill BuildNewBill(Guid groupId, CreateBillInput input, BillComputationResult computation)
    {
        var nowUtc = DateTime.UtcNow;
        var bill = new Bill
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            StoreName = input.StoreName.Trim(),
            TransactionDateUtc = ToUtc(input.TransactionDateUtc),
            CurrencyCode = "MYR",
            SplitMode = input.SplitMode,
            PrimaryPayerParticipantId = input.PrimaryPayerParticipantId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        };

        ApplyBillCollections(
            bill,
            input.Items,
            input.Fees,
            computation.Shares,
            computation.Contributions);

        return bill;
    }

    private static void UpdateBillEntity(Bill bill, UpdateBillInput input, BillComputationResult computation)
    {
        bill.StoreName = input.StoreName.Trim();
        bill.TransactionDateUtc = ToUtc(input.TransactionDateUtc);
        bill.SplitMode = input.SplitMode;
        bill.PrimaryPayerParticipantId = input.PrimaryPayerParticipantId;
        bill.UpdatedAtUtc = DateTime.UtcNow;

        bill.Items.Clear();
        bill.Fees.Clear();
        bill.Shares.Clear();
        bill.Contributions.Clear();

        ApplyBillCollections(
            bill,
            input.Items,
            input.Fees,
            computation.Shares,
            computation.Contributions);
    }

    private static void ApplyBillCollections(
        Bill bill,
        IReadOnlyCollection<BillItemInput> items,
        IReadOnlyCollection<BillFeeInput> fees,
        IReadOnlyCollection<CalculatedShare> shares,
        IReadOnlyCollection<CalculatedContribution> contributions)
    {
        foreach (var item in items)
        {
            var billItemId = Guid.NewGuid();
            bill.Items.Add(new BillItem
            {
                Id = billItemId,
                BillId = bill.Id,
                Description = item.Description.Trim(),
                Amount = RoundToCurrency(item.Amount),
                Responsibilities = item.ResponsibleParticipantIds
                    .Distinct()
                    .OrderBy(x => x)
                    .Select(participantId => new BillItemResponsibility
                    {
                        Id = Guid.NewGuid(),
                        BillItemId = billItemId,
                        ParticipantId = participantId
                    })
                    .ToArray()
            });
        }

        foreach (var fee in fees)
        {
            bill.Fees.Add(new BillFee
            {
                Id = Guid.NewGuid(),
                BillId = bill.Id,
                Name = fee.Name.Trim(),
                FeeType = fee.FeeType,
                Value = RoundToCurrency(fee.Value)
            });
        }

        foreach (var share in shares)
        {
            bill.Shares.Add(new BillShare
            {
                Id = Guid.NewGuid(),
                BillId = bill.Id,
                ParticipantId = share.ParticipantId,
                Weight = share.Weight,
                PreFeeAmount = share.PreFeeAmount,
                FeeAmount = share.FeeAmount,
                TotalShareAmount = share.TotalShareAmount
            });
        }

        foreach (var contribution in contributions.Where(x => x.Amount > 0))
        {
            bill.Contributions.Add(new PaymentContribution
            {
                Id = Guid.NewGuid(),
                BillId = bill.Id,
                ParticipantId = contribution.ParticipantId,
                Amount = RoundToCurrency(contribution.Amount),
                CreatedAtUtc = DateTime.UtcNow
            });
        }
    }

    private async Task<Dictionary<Guid, Participant>> GetAndValidateBillParticipants(
        Guid groupId,
        IReadOnlyCollection<BillParticipantInput> participants,
        Guid primaryPayerParticipantId,
        CancellationToken cancellationToken)
    {
        if (participants.Count == 0)
        {
            throw new DomainValidationException("At least one participant is required.");
        }

        var participantIds = participants.Select(x => x.ParticipantId).Distinct().ToArray();
        var entities = await participantRepository.ListByIdsAsync(groupId, participantIds, cancellationToken);
        var lookup = entities.ToDictionary(x => x.Id, x => x);

        if (lookup.Count != participantIds.Length)
        {
            throw new EntityNotFoundException("One or more participants do not exist in the group.");
        }

        if (!lookup.ContainsKey(primaryPayerParticipantId))
        {
            throw new DomainValidationException("Primary payer participant must be included in bill participants.");
        }

        return lookup;
    }

    private BillComputationResult BuildComputationFromBill(Bill bill)
    {
        var subtotal = RoundToCurrency(bill.Items.Sum(x => x.Amount));
        var totalFee = RoundToCurrency(CalculateAppliedFeeTotal(bill.Items, bill.Fees));
        var grandTotal = RoundToCurrency(bill.Shares.Sum(x => x.TotalShareAmount));

        var appliedFees = bill.Fees.Select(fee =>
        {
            var appliedAmount = fee.FeeType switch
            {
                FeeType.Percentage => RoundToCurrency(subtotal * (fee.Value / 100m)),
                FeeType.Fixed => RoundToCurrency(fee.Value),
                _ => 0m
            };

            return new CalculatedFee(fee.Name, fee.FeeType, fee.Value, appliedAmount);
        }).ToArray();

        var shares = bill.Shares.Select(x => new CalculatedShare(
            x.ParticipantId,
            x.Weight,
            x.PreFeeAmount,
            x.FeeAmount,
            x.TotalShareAmount)).ToArray();

        var contributions = bill.Contributions.Select(x => new CalculatedContribution(
            x.ParticipantId,
            x.Amount)).ToArray();

        return new BillComputationResult(subtotal, totalFee, grandTotal, appliedFees, shares, contributions);
    }

    private static BillDetailDto ToBillDetailDto(
        Bill bill,
        IReadOnlyDictionary<Guid, Participant> participantLookup,
        BillComputationResult computed)
    {
        var appliedFeeByIndex = computed.AppliedFees
            .Select((value, index) => new { index, value })
            .ToDictionary(x => x.index, x => x.value);

        return new BillDetailDto(
            bill.Id,
            bill.GroupId,
            bill.StoreName,
            bill.TransactionDateUtc,
            bill.SplitMode,
            bill.PrimaryPayerParticipantId,
            computed.SubtotalAmount,
            computed.TotalFeeAmount,
            computed.GrandTotalAmount,
            bill.Items
                .OrderBy(x => x.Description)
                .Select(x => new BillItemDto(
                    x.Id,
                    x.Description,
                    x.Amount,
                    x.Responsibilities
                        .OrderBy(responsibility => participantLookup.TryGetValue(responsibility.ParticipantId, out var participant)
                            ? participant.Name
                            : responsibility.ParticipantId.ToString())
                        .Select(responsibility => new BillItemAssigneeDto(
                            responsibility.ParticipantId,
                            participantLookup.TryGetValue(responsibility.ParticipantId, out var participant)
                                ? participant.Name
                                : "Unknown"))
                        .ToArray()))
                .ToArray(),
            bill.Fees
                .Select((x, index) => new BillFeeDto(
                    x.Id,
                    x.Name,
                    x.FeeType,
                    x.Value,
                    appliedFeeByIndex.TryGetValue(index, out var applied) ? applied.AppliedAmount : 0m))
                .ToArray(),
            bill.Shares
                .OrderBy(x => participantLookup.TryGetValue(x.ParticipantId, out var participant)
                    ? participant.Name
                    : x.ParticipantId.ToString())
                .Select(x => new BillShareDto(
                    x.ParticipantId,
                    participantLookup.TryGetValue(x.ParticipantId, out var participant)
                        ? participant.Name
                        : "Unknown",
                    x.Weight,
                    x.PreFeeAmount,
                    x.FeeAmount,
                    x.TotalShareAmount))
                .ToArray(),
            bill.Contributions
                .OrderByDescending(x => x.Amount)
                .ThenBy(x => x.ParticipantId)
                .Select(x => new BillContributionDto(
                    x.ParticipantId,
                    participantLookup.TryGetValue(x.ParticipantId, out var participant)
                        ? participant.Name
                        : "Unknown",
                    x.Amount))
                .ToArray());
    }

    private async Task EnsureGroupExists(Guid groupId, CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }
    }

    private async Task EnsureGroupEditable(Guid groupId, CancellationToken cancellationToken)
    {
        var group = await groupRepository.GetAsync(groupId, cancellationToken);
        if (group is null)
        {
            throw new EntityNotFoundException("Group not found.");
        }

        if (group.Status != GroupStatus.Unresolved)
        {
            throw new DomainValidationException("This group is locked because settlement has already started.");
        }
    }

    private async Task<Bill> GetBillEntity(Guid groupId, Guid billId, CancellationToken cancellationToken)
    {
        var bill = await billRepository.GetAsync(groupId, billId, cancellationToken);
        if (bill is null)
        {
            throw new EntityNotFoundException("Bill not found.");
        }

        return bill;
    }

    private static decimal CalculateAppliedFeeTotal(IEnumerable<BillItem> items, IEnumerable<BillFee> fees)
    {
        var subtotal = RoundToCurrency(items.Sum(x => x.Amount));
        return RoundToCurrency(fees.Sum(fee => fee.FeeType switch
        {
            FeeType.Percentage => RoundToCurrency(subtotal * (fee.Value / 100m)),
            FeeType.Fixed => RoundToCurrency(fee.Value),
            _ => 0m
        }));
    }

    private static DateTime ToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    private static decimal RoundToCurrency(decimal amount)
    {
        return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
    }

    private static void ValidateBillInput(string storeName)
    {
        if (string.IsNullOrWhiteSpace(storeName))
        {
            throw new DomainValidationException("Store name is required.");
        }
    }
}
