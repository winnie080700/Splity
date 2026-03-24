namespace Splity.Domain.Entities;

public sealed class SettlementShareLink
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string ShareToken { get; set; } = string.Empty;
    public DateTime? FromDateUtc { get; set; }
    public DateTime? ToDateUtc { get; set; }
    public string? CreatorName { get; set; }
    public string? PayeeName { get; set; }
    public string? PaymentMethod { get; set; }
    public string? AccountName { get; set; }
    public string? AccountNumber { get; set; }
    public string? Notes { get; set; }
    public string? PaymentQrDataUrl { get; set; }
    public string? ReceiverPaymentInfosJson { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }

    public Group? Group { get; set; }
}
