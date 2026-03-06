namespace Splity.Domain.Entities;

public sealed class BillShare
{
    public Guid Id { get; set; }
    public Guid BillId { get; set; }
    public Guid ParticipantId { get; set; }
    public decimal Weight { get; set; }
    public decimal PreFeeAmount { get; set; }
    public decimal FeeAmount { get; set; }
    public decimal TotalShareAmount { get; set; }

    public Bill? Bill { get; set; }
    public Participant? Participant { get; set; }
}
