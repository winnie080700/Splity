using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;

namespace Splity.Api.Endpoints;

public static class SettlementShareEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        app.MapPost("/api/groups/{groupId:guid}/settlement-shares", async (
                Guid groupId,
                CreateSettlementShareRequest request,
                ISettlementSharesService service,
                CancellationToken ct) =>
            {
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
            request.PaymentInfo is null
                ? null
                : new SettlementSharePaymentInfoDto(
                    request.PaymentInfo.PayeeName ?? string.Empty,
                    request.PaymentInfo.PaymentMethod ?? string.Empty,
                    request.PaymentInfo.AccountName ?? string.Empty,
                    request.PaymentInfo.AccountNumber ?? string.Empty,
                    request.PaymentInfo.Notes ?? string.Empty,
                    request.PaymentInfo.PaymentQrDataUrl ?? string.Empty));
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
