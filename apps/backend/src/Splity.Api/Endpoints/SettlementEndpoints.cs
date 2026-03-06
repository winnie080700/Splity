using Splity.Application.Services;

namespace Splity.Api.Endpoints;

public static class SettlementEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups/{groupId:guid}/settlements").WithTags("Settlements");

        group.MapGet("/", async (
                Guid groupId,
                DateTime? fromDate,
                DateTime? toDate,
                ISettlementsService service,
                CancellationToken ct) =>
            {
                var result = await service.GetAsync(groupId, NormalizeDate(fromDate), NormalizeDate(toDate), ct);
                return Results.Ok(result);
            })
            .WithName("GetSettlements")
            .WithSummary("Get aggregated net balances and transfer plan.");
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
