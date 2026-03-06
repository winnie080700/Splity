namespace Splity.Domain.Entities;

public sealed class Participant
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public Group? Group { get; set; }
    public ICollection<BillShare> BillShares { get; set; } = new List<BillShare>();
    public ICollection<PaymentContribution> PaymentContributions { get; set; } = new List<PaymentContribution>();
}
