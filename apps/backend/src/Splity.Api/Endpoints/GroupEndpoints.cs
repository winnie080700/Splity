using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;
using System.Security.Claims;

namespace Splity.Api.Endpoints;

public static class GroupEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups")
            .WithTags("Groups")
            .RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, IAppUserIdentityService identityService, IGroupsService service, CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                var result = await service.ListAccessibleAsync(userId, ct);
                return Results.Ok(result);
            })
            .WithName("ListGroups")
            .WithSummary("List groups the current user can access.");

        group.MapPost("/", async (ClaimsPrincipal user, CreateGroupRequest request, IAppUserIdentityService identityService, IGroupsService service, CancellationToken ct) =>
            {
                var creatorUserId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                var result = await service.CreateAsync(new CreateGroupInput(request.Name), creatorUserId, ct);
                return Results.Created($"/api/groups/{result.Id}", result);
            })
            .WithName("CreateGroup")
            .WithSummary("Create a group for the current user.");

        group.MapGet("/{groupId:guid}", async (
                Guid groupId,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IGroupsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                var access = await accessService.EnsureCanViewAsync(groupId, userId, ct);
                var result = await service.GetAsync(groupId, ct);
                return Results.Ok(result with { CanEdit = access.CanEdit });
            })
            .WithName("GetGroup")
            .WithSummary("Get a group detail.");

        group.MapPut("/{groupId:guid}", async (
                Guid groupId,
                UpdateGroupRequest request,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IGroupsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                var result = await service.UpdateAsync(groupId, new UpdateGroupInput(request.Name), ct);
                return Results.Ok(result);
            })
            .WithName("UpdateGroup")
            .WithSummary("Update a group name.");

        group.MapPut("/{groupId:guid}/status", async (
                Guid groupId,
                UpdateGroupStatusRequest request,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IGroupsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                var result = await service.UpdateStatusAsync(groupId, new UpdateGroupStatusInput(request.Status), ct);
                return Results.Ok(result);
            })
            .WithName("UpdateGroupStatus")
            .WithSummary("Update a group status.");

        group.MapDelete("/{groupId:guid}", async (
                Guid groupId,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IGroupsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                await service.DeleteAsync(groupId, ct);
                return Results.NoContent();
            })
            .WithName("DeleteGroup")
            .WithSummary("Delete a group.");
    }
}
