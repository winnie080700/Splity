namespace Splity.Application.Services;

public interface IGroupAccessService
{
    Task<GroupAccessResult> EnsureCanViewAsync(Guid groupId, Guid userId, CancellationToken cancellationToken);
    Task EnsureCanEditAsync(Guid groupId, Guid userId, CancellationToken cancellationToken);
}

public sealed record GroupAccessResult(bool CanEdit);
