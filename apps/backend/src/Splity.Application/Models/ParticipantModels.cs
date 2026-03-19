namespace Splity.Application.Models;

public sealed record CreateParticipantInput(string Name);
public sealed record UpdateParticipantInput(string Name);

public sealed record ParticipantDto(Guid Id, Guid GroupId, string Name, DateTime CreatedAtUtc);
