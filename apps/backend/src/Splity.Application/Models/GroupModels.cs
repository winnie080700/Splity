namespace Splity.Application.Models;

public sealed record CreateGroupInput(string Name);
public sealed record UpdateGroupInput(string Name);
public sealed record UpdateGroupStatusInput(string Status);

public sealed record GroupDto(Guid Id, string Name, DateTime CreatedAtUtc, string Status, string? CreatedByUserName, bool CanEdit);
public sealed record GroupSummaryDto(Guid Id, string Name, DateTime CreatedAtUtc, string Status, bool CanEdit);
