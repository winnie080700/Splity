namespace Splity.Domain.Entities;

using Splity.Domain.Enums;

public sealed class Group
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? CreatedByUserId { get; set; }
    public GroupStatus Status { get; set; } = GroupStatus.Unresolved;
    public DateTime CreatedAtUtc { get; set; }

    public AppUser? CreatedByUser { get; set; }
    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
    public ICollection<Bill> Bills { get; set; } = new List<Bill>();
}
