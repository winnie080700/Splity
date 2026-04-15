using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;
using System.Security.Claims;

namespace Splity.Api.Endpoints;

public static class ParticipantEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups/{groupId:guid}/participants")
            .WithTags("Participants")
            .RequireAuthorization();

        group.MapPost("/", async (
                Guid groupId,
                CreateParticipantRequest request,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IParticipantsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                var result = await service.CreateAsync(groupId, new CreateParticipantInput(request.Name, request.Username), ct);
                return Results.Created($"/api/groups/{groupId}/participants/{result.Id}", result);
            })
            .WithName("CreateParticipant")
            .WithSummary("Create a participant in a group.");

        group.MapGet("/", async (
                Guid groupId,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IParticipantsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanViewAsync(groupId, userId, ct);
                var result = await service.ListAsync(groupId, ct);
                return Results.Ok(result);
            })
            .WithName("ListParticipants")
            .WithSummary("List participants by group.");

        group.MapPut("/{participantId:guid}", async (
                Guid groupId,
                Guid participantId,
                UpdateParticipantRequest request,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IParticipantsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                var result = await service.UpdateAsync(groupId, participantId, new UpdateParticipantInput(request.Name, request.Username), ct);
                return Results.Ok(result);
            })
            .WithName("UpdateParticipant")
            .WithSummary("Update a participant name.");

        group.MapDelete("/{participantId:guid}", async (
                Guid groupId,
                Guid participantId,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                IParticipantsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                await service.DeleteAsync(groupId, participantId, ct);
                return Results.NoContent();
            })
            .WithName("DeleteParticipant")
            .WithSummary("Delete a participant when no bill references remain.");
    }
}
