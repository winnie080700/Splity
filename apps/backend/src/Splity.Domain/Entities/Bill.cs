using Splity.Domain.Enums;

namespace Splity.Domain.Entities;

public sealed class Bill
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string? ReferenceImageDataUrl { get; set; }
    public DateTime TransactionDateUtc { get; set; }
    public string CurrencyCode { get; set; } = "MYR";
    public SplitMode SplitMode { get; set; }
    public Guid PrimaryPayerParticipantId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public Group? Group { get; set; }
    public ICollection<BillItem> Items { get; set; } = new List<BillItem>();
    public ICollection<BillFee> Fees { get; set; } = new List<BillFee>();
    public ICollection<BillShare> Shares { get; set; } = new List<BillShare>();
    public ICollection<PaymentContribution> Contributions { get; set; } = new List<PaymentContribution>();
}
