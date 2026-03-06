namespace Splity.Domain.Entities;

public sealed class BillItem
{
    public Guid Id { get; set; }
    public Guid BillId { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }

    public Bill? Bill { get; set; }
}
