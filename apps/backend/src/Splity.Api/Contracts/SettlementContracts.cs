namespace Splity.Api.Contracts;

public sealed record UpdateSettlementTransferStatusRequest(
    Guid FromParticipantId,
    Guid ToParticipantId,
    decimal Amount,
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    Guid ActorParticipantId,
    string? ProofScreenshotDataUrl);

public sealed record SettlementSharePaymentInfoRequest(
    string? PayeeName,
    string? PaymentMethod,
    string? AccountName,
    string? AccountNumber,
    string? Notes,
    string? PaymentQrDataUrl);

public sealed record CreateSettlementShareRequest(
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    string? CreatorName,
    SettlementSharePaymentInfoRequest? PaymentInfo);
