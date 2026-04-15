using Splity.Application.Services;
using System.Security.Claims;

namespace Splity.Api.Endpoints;

public static class InvitationEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var invitations = app.MapGroup("/api/invitations")
            .WithTags("Invitations")
            .RequireAuthorization();

        invitations.MapGet("/", async (
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IInvitationsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                var result = await service.ListPendingAsync(userId, ct);
                return Results.Ok(result);
            })
            .WithName("ListInvitations")
            .WithSummary("List pending invitations for the current user.");

        invitations.MapPost("/{participantId:guid}/accept", async (
                Guid participantId,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IInvitationsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await service.AcceptAsync(userId, participantId, ct);
                return Results.Ok();
            })
            .WithName("AcceptInvitation")
            .WithSummary("Accept an invitation.");

        invitations.MapPost("/{participantId:guid}/decline", async (
                Guid participantId,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IInvitationsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await service.DeclineAsync(userId, participantId, ct);
                return Results.Ok();
            })
            .WithName("DeclineInvitation")
            .WithSummary("Decline an invitation.");
    }
}
