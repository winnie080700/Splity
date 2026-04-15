using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;
using System.Security.Claims;

namespace Splity.Api.Endpoints;

public static class SettlementEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups/{groupId:guid}/settlements")
            .WithTags("Settlements")
            .RequireAuthorization();

        group.MapGet("/", async (
                Guid groupId,
                DateTime? fromDate,
                DateTime? toDate,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                ISettlementsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanViewAsync(groupId, userId, ct);
                var result = await service.GetAsync(groupId, NormalizeDate(fromDate), NormalizeDate(toDate), ct);
                return Results.Ok(result);
            })
            .WithName("GetSettlements")
            .WithSummary("Get aggregated net balances and transfer plan.");

        group.MapPost("/mark-paid", async (
                Guid groupId,
                UpdateSettlementTransferStatusRequest request,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                ISettlementsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                var result = await service.MarkPaidAsync(groupId, ToUpdateInput(request), ct);
                return Results.Ok(result);
            })
            .WithName("MarkSettlementPaid")
            .WithSummary("Mark a settlement transfer as paid.");

        group.MapPost("/mark-received", async (
                Guid groupId,
                UpdateSettlementTransferStatusRequest request,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                ISettlementsService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                var result = await service.MarkReceivedAsync(groupId, ToUpdateInput(request), ct);
                return Results.Ok(result);
            })
            .WithName("MarkSettlementReceived")
            .WithSummary("Mark a settlement transfer as received.");
    }

    private static UpdateSettlementTransferStatusInput ToUpdateInput(UpdateSettlementTransferStatusRequest request)
    {
        return new UpdateSettlementTransferStatusInput(
            request.FromParticipantId,
            request.ToParticipantId,
            request.Amount,
            NormalizeDate(request.FromDateUtc),
            NormalizeDate(request.ToDateUtc),
            request.ActorParticipantId,
            request.ProofScreenshotDataUrl);
    }

    private static DateTime? NormalizeDate(DateTime? value)
    {
        if (!value.HasValue)
        {
            return null;
        }

        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        };
    }
}
