namespace Splity.Application.Models;

public sealed record SettlementSharePaymentInfoDto(
    string PayeeName,
    string PaymentMethod,
    string AccountName,
    string AccountNumber,
    string Notes,
    string PaymentQrDataUrl);

public sealed record SettlementShareReceiverPaymentInfoDto(
    Guid ParticipantId,
    string ParticipantName,
    SettlementSharePaymentInfoDto PaymentInfo);

public sealed record CreateSettlementShareInput(
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    string? CreatorName,
    IReadOnlyCollection<SettlementShareReceiverPaymentInfoDto> ReceiverPaymentInfos,
    bool Regenerate);

public sealed record SettlementShareRecordDto(
    string ShareToken,
    Guid GroupId,
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    string? CreatorName,
    IReadOnlyCollection<SettlementShareReceiverPaymentInfoDto> ReceiverPaymentInfos,
    DateTime CreatedAtUtc);

public sealed record SettlementSharePublicDto(
    string ShareToken,
    Guid GroupId,
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    string? CreatorName,
    IReadOnlyCollection<SettlementShareReceiverPaymentInfoDto> ReceiverPaymentInfos);
