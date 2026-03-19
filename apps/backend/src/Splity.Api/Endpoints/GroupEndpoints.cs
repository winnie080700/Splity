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

        group.MapPost("/", async (ClaimsPrincipal user, CreateGroupRequest request, IGroupsService service, CancellationToken ct) =>
            {
                var creatorUserId = TryGetUserId(user);
                var result = await service.CreateAsync(new CreateGroupInput(request.Name), creatorUserId, ct);
                return Results.Created($"/api/groups/{result.Id}", result);
            })
            .WithName("CreateGroup")
            .WithSummary("Create a local demo group.");

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
