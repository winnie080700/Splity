namespace Splity.Domain.Entities;

public sealed class PaymentContribution
{
    public Guid Id { get; set; }
    public Guid BillId { get; set; }
    public Guid ParticipantId { get; set; }
    public decimal Amount { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public Bill? Bill { get; set; }
    public Participant? Participant { get; set; }
}
