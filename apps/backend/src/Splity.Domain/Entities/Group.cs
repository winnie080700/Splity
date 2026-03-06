namespace Splity.Domain.Entities;

public sealed class Group
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
}
