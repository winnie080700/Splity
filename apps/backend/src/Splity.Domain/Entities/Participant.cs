namespace Splity.Domain.Entities;

using Splity.Domain.Enums;

public sealed class Participant
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Username { get; set; }
    public Guid? InvitedUserId { get; set; }
    public ParticipantInvitationStatus InvitationStatus { get; set; } = ParticipantInvitationStatus.None;
    public DateTime CreatedAtUtc { get; set; }

    public Group? Group { get; set; }
    public AppUser? InvitedUser { get; set; }
    public ICollection<BillShare> BillShares { get; set; } = new List<BillShare>();
    public ICollection<PaymentContribution> PaymentContributions { get; set; } = new List<PaymentContribution>();
    public ICollection<BillItemResponsibility> BillItemResponsibilities { get; set; } = new List<BillItemResponsibility>();
}
