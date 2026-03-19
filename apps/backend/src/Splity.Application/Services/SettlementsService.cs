using Splity.Application.Abstractions;
using Splity.Application.Calculations;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

namespace Splity.Application.Services;

public sealed class SettlementsService(
    IGroupRepository groupRepository,
    IParticipantRepository participantRepository,
    IBillRepository billRepository,
    ISettlementTransferConfirmationRepository confirmationRepository,
    ISettlementCalculator settlementCalculator,
    IUnitOfWork unitOfWork) : ISettlementsService
{
    public async Task<SettlementResultDto> GetAsync(
        Guid groupId,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken)
    {
        await EnsureGroupExists(groupId, cancellationToken);

        var snapshot = await BuildSnapshotAsync(groupId, fromDateUtc, toDateUtc, cancellationToken);
        var participantLookup = snapshot.Participants.ToDictionary(x => x.Id, x => x.Name);

        var balanceDtos = snapshot.NetBalances
            .OrderByDescending(x => x.NetAmount)
            .ThenBy(x => participantLookup.TryGetValue(x.ParticipantId, out var name) ? name : x.ParticipantId.ToString())
            .Select(x => new ParticipantNetBalanceDto(
                x.ParticipantId,
                participantLookup.TryGetValue(x.ParticipantId, out var name) ? name : "Unknown",
                x.NetAmount))
            .ToArray();

        var transfers = await BuildTransferDtosAsync(
            groupId,
            fromDateUtc,
            toDateUtc,
            snapshot.Transfers,
            cancellationToken);

        return new SettlementResultDto(
            groupId,
            fromDateUtc,
            toDateUtc,
            balanceDtos,
            transfers);
    }

    public async Task<SettlementTransferDto> MarkPaidAsync(
        Guid groupId,
        UpdateSettlementTransferStatusInput input,
        CancellationToken cancellationToken)
    {
        await EnsureGroupExists(groupId, cancellationToken);

        if (input.ActorParticipantId != input.FromParticipantId)
        {
            throw new DomainValidationException("Only the payer can mark this transfer as paid.");
        }

        await EnsureParticipantExistsAsync(groupId, input.ActorParticipantId, cancellationToken);

        var transfer = await GetTransferFromSnapshotAsync(groupId, input, cancellationToken);
        var transferKey = BuildTransferKey(groupId, input.FromDateUtc, input.ToDateUtc, transfer);
        var confirmation = await confirmationRepository.GetByTransferKeyAsync(groupId, transferKey, cancellationToken);

        if (confirmation is null)
        {
            confirmation = new SettlementTransferConfirmation
            {
                Id = Guid.NewGuid(),
                GroupId = groupId,
                TransferKey = transferKey,
                FromParticipantId = transfer.FromParticipantId,
                ToParticipantId = transfer.ToParticipantId,
                Amount = RoundToCurrency(transfer.Amount),
                FromDateUtc = input.FromDateUtc,
                ToDateUtc = input.ToDateUtc,
                Status = SettlementTransferStatus.Pending,
                ProofScreenshotDataUrl = NormalizeProofScreenshot(input.ProofScreenshotDataUrl),
                UpdatedAtUtc = DateTime.UtcNow
            };

            await confirmationRepository.AddAsync(confirmation, cancellationToken);
        }

        if (confirmation.Status == SettlementTransferStatus.Received)
        {
            throw new DomainValidationException("This transfer has already been marked as received.");
        }

        if (confirmation.Status == SettlementTransferStatus.MarkedPaid)
        {
            if (!string.IsNullOrWhiteSpace(input.ProofScreenshotDataUrl) &&
                !string.Equals(confirmation.ProofScreenshotDataUrl, input.ProofScreenshotDataUrl, StringComparison.Ordinal))
            {
                confirmation.ProofScreenshotDataUrl = NormalizeProofScreenshot(input.ProofScreenshotDataUrl);
                confirmation.UpdatedAtUtc = DateTime.UtcNow;
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return ToTransferDto(transferKey, transfer, confirmation);
        }

        confirmation.Status = SettlementTransferStatus.MarkedPaid;
        if (!string.IsNullOrWhiteSpace(input.ProofScreenshotDataUrl))
        {
            confirmation.ProofScreenshotDataUrl = NormalizeProofScreenshot(input.ProofScreenshotDataUrl);
        }
        confirmation.MarkedPaidAtUtc ??= DateTime.UtcNow;
        confirmation.UpdatedAtUtc = DateTime.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return ToTransferDto(transferKey, transfer, confirmation);
    }

    public async Task<SettlementTransferDto> MarkReceivedAsync(
        Guid groupId,
        UpdateSettlementTransferStatusInput input,
        CancellationToken cancellationToken)
    {
        await EnsureGroupExists(groupId, cancellationToken);

        if (input.ActorParticipantId != input.ToParticipantId)
        {
            throw new DomainValidationException("Only the receiver can mark this transfer as received.");
        }

        await EnsureParticipantExistsAsync(groupId, input.ActorParticipantId, cancellationToken);

        var transfer = await GetTransferFromSnapshotAsync(groupId, input, cancellationToken);
        var transferKey = BuildTransferKey(groupId, input.FromDateUtc, input.ToDateUtc, transfer);
        var confirmation = await confirmationRepository.GetByTransferKeyAsync(groupId, transferKey, cancellationToken);

        if (confirmation is null || confirmation.Status == SettlementTransferStatus.Pending)
        {
            throw new DomainValidationException("The payer needs to mark this transfer as paid first.");
        }

        if (confirmation.Status == SettlementTransferStatus.Received)
        {
            return ToTransferDto(transferKey, transfer, confirmation);
        }

        confirmation.Status = SettlementTransferStatus.Received;
        confirmation.MarkedPaidAtUtc ??= DateTime.UtcNow;
        confirmation.MarkedReceivedAtUtc ??= DateTime.UtcNow;
        confirmation.UpdatedAtUtc = DateTime.UtcNow;

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return ToTransferDto(transferKey, transfer, confirmation);
    }

    private async Task<SettlementSnapshot> BuildSnapshotAsync(
        Guid groupId,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        CancellationToken cancellationToken)
    {
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

        var transfers = settlementCalculator.CalculateTransfers(netBalances).ToArray();
        return new SettlementSnapshot(participants, netBalances, transfers);
    }

    private async Task<IReadOnlyCollection<SettlementTransferDto>> BuildTransferDtosAsync(
        Guid groupId,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        IReadOnlyCollection<SettlementTransfer> transfers,
        CancellationToken cancellationToken)
    {
        var transferKeys = transfers
            .Select(transfer => BuildTransferKey(groupId, fromDateUtc, toDateUtc, transfer))
            .ToArray();

        var confirmations = await confirmationRepository.ListByTransferKeysAsync(groupId, transferKeys, cancellationToken);
        var confirmationByKey = confirmations.ToDictionary(x => x.TransferKey, x => x);

        return transfers
            .Select(transfer =>
            {
                var transferKey = BuildTransferKey(groupId, fromDateUtc, toDateUtc, transfer);
                confirmationByKey.TryGetValue(transferKey, out var confirmation);
                return ToTransferDto(transferKey, transfer, confirmation);
            })
            .ToArray();
    }

    private async Task<SettlementTransfer> GetTransferFromSnapshotAsync(
        Guid groupId,
        UpdateSettlementTransferStatusInput input,
        CancellationToken cancellationToken)
    {
        var snapshot = await BuildSnapshotAsync(groupId, input.FromDateUtc, input.ToDateUtc, cancellationToken);
        var amount = RoundToCurrency(input.Amount);

        var transfer = snapshot.Transfers.FirstOrDefault(x =>
            x.FromParticipantId == input.FromParticipantId &&
            x.ToParticipantId == input.ToParticipantId &&
            RoundToCurrency(x.Amount) == amount);

        if (transfer is null)
        {
            throw new EntityNotFoundException("Settlement transfer not found for the current filters.");
        }

        return transfer;
    }

    private async Task EnsureParticipantExistsAsync(Guid groupId, Guid participantId, CancellationToken cancellationToken)
    {
        var participants = await participantRepository.ListByIdsAsync(groupId, new[] { participantId }, cancellationToken);
        if (participants.Count == 0)
        {
            throw new EntityNotFoundException("Participant not found.");
        }
    }

    private async Task EnsureGroupExists(Guid groupId, CancellationToken cancellationToken)
    {
        if (!await groupRepository.ExistsAsync(groupId, cancellationToken))
        {
            throw new EntityNotFoundException("Group not found.");
        }
    }

    private static SettlementTransferDto ToTransferDto(
        string transferKey,
        SettlementTransfer transfer,
        SettlementTransferConfirmation? confirmation)
    {
        return new SettlementTransferDto(
            transferKey,
            transfer.FromParticipantId,
            transfer.ToParticipantId,
            RoundToCurrency(transfer.Amount),
            confirmation?.Status ?? SettlementTransferStatus.Pending,
            confirmation?.ProofScreenshotDataUrl,
            confirmation?.MarkedPaidAtUtc,
            confirmation?.MarkedReceivedAtUtc);
    }

    private static string BuildTransferKey(
        Guid groupId,
        DateTime? fromDateUtc,
        DateTime? toDateUtc,
        SettlementTransfer transfer)
    {
        var fromPart = fromDateUtc?.ToString("O") ?? "none";
        var toPart = toDateUtc?.ToString("O") ?? "none";
        return $"{groupId:N}:{fromPart}:{toPart}:{transfer.FromParticipantId:N}:{transfer.ToParticipantId:N}:{RoundToCurrency(transfer.Amount):0.00}";
    }

    private static decimal RoundToCurrency(decimal amount)
    {
        return Math.Round(amount, 2, MidpointRounding.AwayFromZero);
    }

    private static string? NormalizeProofScreenshot(string? proofScreenshotDataUrl)
    {
        var normalized = proofScreenshotDataUrl?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private sealed record SettlementSnapshot(
        IReadOnlyCollection<Participant> Participants,
        IReadOnlyCollection<NetBalance> NetBalances,
        IReadOnlyCollection<SettlementTransfer> Transfers);
}
