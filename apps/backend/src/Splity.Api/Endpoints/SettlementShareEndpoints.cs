using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;
using System.Security.Claims;

namespace Splity.Api.Endpoints;

public static class SettlementShareEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups/{groupId:guid}/settlement-shares")
            .WithTags("Settlement Shares")
            .RequireAuthorization();

        group.MapGet("/", async (
                Guid groupId,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                ISettlementSharesService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanViewAsync(groupId, userId, ct);
                var result = await service.GetActiveAsync(groupId, ct);
                return Results.Ok(result);
            })
            .WithName("GetCurrentSettlementShare")
            .WithSummary("Get the current active settlement share for a group.");

        group.MapPost("/", async (
                Guid groupId,
                CreateSettlementShareRequest request,
                ClaimsPrincipal user,
                IAppUserIdentityService identityService,
                IGroupAccessService accessService,
                ISettlementSharesService service,
                CancellationToken ct) =>
            {
                var userId = await EndpointUserContext.ResolveUserIdAsync(user, identityService, ct);
                await accessService.EnsureCanEditAsync(groupId, userId, ct);
                var result = await service.CreateAsync(groupId, ToCreateInput(request), ct);
                return Results.Ok(result);
            })
            .WithName("CreateSettlementShare")
            .WithSummary("Create an opaque public settlement share token.");

        app.MapGet("/api/settlement-shares/{shareToken}", async (
                string shareToken,
                ISettlementSharesService service,
                CancellationToken ct) =>
            {
                var result = await service.GetByTokenAsync(shareToken, ct);
                return Results.Ok(result);
            })
            .WithName("GetSettlementShare")
            .WithSummary("Resolve an opaque settlement share token.");
    }

    private static CreateSettlementShareInput ToCreateInput(CreateSettlementShareRequest request)
    {
        return new CreateSettlementShareInput(
            NormalizeDate(request.FromDateUtc),
            NormalizeDate(request.ToDateUtc),
            request.CreatorName,
            (request.ReceiverPaymentInfos ?? Array.Empty<SettlementShareReceiverPaymentInfoRequest>())
                .Select(receiver => new SettlementShareReceiverPaymentInfoDto(
                    receiver.ParticipantId,
                    string.Empty,
                    receiver.PaymentInfo is null
                        ? new SettlementSharePaymentInfoDto(string.Empty, string.Empty, string.Empty, string.Empty, string.Empty, string.Empty)
                        : new SettlementSharePaymentInfoDto(
                            receiver.PaymentInfo.PayeeName ?? string.Empty,
                            receiver.PaymentInfo.PaymentMethod ?? string.Empty,
                            receiver.PaymentInfo.AccountName ?? string.Empty,
                            receiver.PaymentInfo.AccountNumber ?? string.Empty,
                            receiver.PaymentInfo.Notes ?? string.Empty,
                            receiver.PaymentInfo.PaymentQrDataUrl ?? string.Empty)))
                .ToArray(),
            request.Regenerate);
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
