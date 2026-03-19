namespace Splity.Application.Models;

public sealed record SettlementSharePaymentInfoDto(
    string PayeeName,
    string PaymentMethod,
    string AccountName,
    string AccountNumber,
    string Notes,
    string PaymentQrDataUrl);

public sealed record CreateSettlementShareInput(
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    string? CreatorName,
    SettlementSharePaymentInfoDto? PaymentInfo);

public sealed record SettlementShareLinkDto(
    string ShareToken,
    DateTime CreatedAtUtc);

public sealed record SettlementSharePublicDto(
    string ShareToken,
    Guid GroupId,
    DateTime? FromDateUtc,
    DateTime? ToDateUtc,
    string? CreatorName,
    SettlementSharePaymentInfoDto? PaymentInfo);
