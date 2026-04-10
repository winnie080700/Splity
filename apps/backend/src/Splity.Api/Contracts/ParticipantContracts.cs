namespace Splity.Api.Contracts;

public sealed record CreateParticipantRequest(string Name, string? Username);
public sealed record UpdateParticipantRequest(string Name, string? Username);
