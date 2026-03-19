namespace Splity.Domain.Entities;

public sealed class BillItemResponsibility
{
    public Guid Id { get; set; }
    public Guid BillItemId { get; set; }
    public Guid ParticipantId { get; set; }

    public BillItem? BillItem { get; set; }
    public Participant? Participant { get; set; }
}
