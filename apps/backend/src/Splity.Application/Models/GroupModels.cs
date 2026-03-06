namespace Splity.Application.Models;

public sealed record CreateGroupInput(string Name);

public sealed record GroupDto(Guid Id, string Name, DateTime CreatedAtUtc);
