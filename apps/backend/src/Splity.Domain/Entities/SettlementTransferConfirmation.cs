using Splity.Domain.Enums;

namespace Splity.Domain.Entities;

public sealed class SettlementTransferConfirmation
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string TransferKey { get; set; } = string.Empty;
    public Guid FromParticipantId { get; set; }
    public Guid ToParticipantId { get; set; }
    public decimal Amount { get; set; }
    public DateTime? FromDateUtc { get; set; }
    public DateTime? ToDateUtc { get; set; }
    public SettlementTransferStatus Status { get; set; }
    public string? ProofScreenshotDataUrl { get; set; }
    public DateTime? MarkedPaidAtUtc { get; set; }
    public DateTime? MarkedReceivedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}
