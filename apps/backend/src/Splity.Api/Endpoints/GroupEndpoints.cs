using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;
using System.Security.Claims;

namespace Splity.Api.Endpoints;

public static class GroupEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups").WithTags("Groups");

        group.MapGet("/", async (ClaimsPrincipal user, IGroupsService service, CancellationToken ct) =>
            {
                var creatorUserId = TryGetUserId(user);
                if (!creatorUserId.HasValue)
                {
                    return Results.Ok(Array.Empty<GroupSummaryDto>());
                }

                var result = await service.ListByCreatorAsync(creatorUserId.Value, ct);
                return Results.Ok(result);
            })
            .WithName("ListGroups")
            .WithSummary("List groups created by the current user.");

        group.MapPost("/", async (ClaimsPrincipal user, CreateGroupRequest request, IGroupsService service, CancellationToken ct) =>
            {
                var creatorUserId = TryGetUserId(user);
                var result = await service.CreateAsync(new CreateGroupInput(request.Name), creatorUserId, ct);
                return Results.Created($"/api/groups/{result.Id}", result);
            })
            .WithName("CreateGroup")
            .WithSummary("Create a group for the current user.");

        group.MapGet("/{groupId:guid}", async (Guid groupId, IGroupsService service, CancellationToken ct) =>
            {
                var result = await service.GetAsync(groupId, ct);
                return Results.Ok(result);
            })
            .WithName("GetGroup")
            .WithSummary("Get a group detail.");

        group.MapPut("/{groupId:guid}", async (Guid groupId, UpdateGroupRequest request, IGroupsService service, CancellationToken ct) =>
            {
                var result = await service.UpdateAsync(groupId, new UpdateGroupInput(request.Name), ct);
                return Results.Ok(result);
            })
            .WithName("UpdateGroup")
            .WithSummary("Update a group name.");

        group.MapPut("/{groupId:guid}/status", async (Guid groupId, UpdateGroupStatusRequest request, IGroupsService service, CancellationToken ct) =>
            {
                var result = await service.UpdateStatusAsync(groupId, new UpdateGroupStatusInput(request.Status), ct);
                return Results.Ok(result);
            })
            .WithName("UpdateGroupStatus")
            .WithSummary("Update a group status.");

        group.MapDelete("/{groupId:guid}", async (Guid groupId, IGroupsService service, CancellationToken ct) =>
            {
                await service.DeleteAsync(groupId, ct);
                return Results.NoContent();
            })
            .WithName("DeleteGroup")
            .WithSummary("Delete a group.");
    }

    private static Guid? TryGetUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var userId) ? userId : null;
    }
}
