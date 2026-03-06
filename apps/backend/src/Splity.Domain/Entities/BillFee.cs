using Splity.Domain.Enums;

namespace Splity.Domain.Entities;

public sealed class BillFee
{
    public Guid Id { get; set; }
    public Guid BillId { get; set; }
    public string Name { get; set; } = string.Empty;
    public FeeType FeeType { get; set; }
    public decimal Value { get; set; }

    public Bill? Bill { get; set; }
}
