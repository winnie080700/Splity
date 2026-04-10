namespace Splity.Application.Models;

public sealed record CreateParticipantInput(string Name, string? Username);
public sealed record UpdateParticipantInput(string Name, string? Username);

public sealed record ParticipantDto(Guid Id, Guid GroupId, string Name, string? Username, DateTime CreatedAtUtc);
