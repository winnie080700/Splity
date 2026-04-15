namespace Splity.Application.Models;

public sealed record CreateParticipantInput(string Name, string? Username);
public sealed record UpdateParticipantInput(string Name, string? Username);

public sealed record ParticipantDto(
    Guid Id,
    Guid GroupId,
    string Name,
    string? Username,
    string InvitationStatus,
    DateTime CreatedAtUtc);

public sealed record InvitationDto(
    Guid ParticipantId,
    Guid GroupId,
    string GroupName,
    string ParticipantName,
    string? ParticipantUsername,
    string InvitedByName,
    DateTime InvitedAtUtc);
