using Splity.Domain.Enums;

namespace Splity.Application.Models;

public sealed record ParticipantNetBalanceDto(Guid ParticipantId, string ParticipantName, decimal NetAmount);

public sealed record SettlementTransferDto(
    string TransferKey,
    Guid FromParticipantId,
    Guid ToParticipantId,
    decimal Amount,
    SettlementTransferStatus Status,
    string? ProofScreenshotDataUrl,
    DateTime? MarkedPaidAtUtc,
    DateTime? MarkedReceivedAtUtc);

public sealed record UpdateSettlementTransferStatusInput(
    Guid FromParticipantId,
    Guid ToParticipantId,
    decimal Amount,
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    Guid ActorParticipantId,
    string? ProofScreenshotDataUrl);

public sealed record SettlementResultDto(
    Guid GroupId,
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    IReadOnlyCollection<ParticipantNetBalanceDto> NetBalances,
    IReadOnlyCollection<SettlementTransferDto> Transfers);
