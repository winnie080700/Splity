using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;

namespace Splity.Api.Endpoints;

public static class BillEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups/{groupId:guid}/bills").WithTags("Bills");

        group.MapPost("/", async (Guid groupId, CreateBillRequest request, IBillsService service, CancellationToken ct) =>
            {
                var result = await service.CreateAsync(groupId, ToCreateInput(request), ct);
                return Results.Created($"/api/groups/{groupId}/bills/{result.Id}", result);
            })
            .WithName("CreateBill")
            .WithSummary("Create a bill with split, fees, and contributions.");

        group.MapGet("/", async (
                Guid groupId,
                string? store,
                DateTime? fromDate,
                DateTime? toDate,
                IBillsService service,
                CancellationToken ct) =>
            {
                var result = await service.ListAsync(groupId, store, NormalizeDate(fromDate), NormalizeDate(toDate), ct);
                return Results.Ok(result);
            })
            .WithName("ListBills")
            .WithSummary("List bills by group with optional store/date filters.");

        group.MapGet("/{billId:guid}", async (Guid groupId, Guid billId, IBillsService service, CancellationToken ct) =>
            {
                var result = await service.GetAsync(groupId, billId, ct);
                return Results.Ok(result);
            })
            .WithName("GetBill")
            .WithSummary("Get a bill detail.");

        group.MapPut("/{billId:guid}", async (Guid groupId, Guid billId, UpdateBillRequest request, IBillsService service, CancellationToken ct) =>
            {
                var result = await service.UpdateAsync(groupId, billId, ToUpdateInput(request), ct);
                return Results.Ok(result);
            })
            .WithName("UpdateBill")
            .WithSummary("Update a bill and recompute shares.");

        group.MapDelete("/{billId:guid}", async (Guid groupId, Guid billId, IBillsService service, CancellationToken ct) =>
            {
                await service.DeleteAsync(groupId, billId, ct);
                return Results.NoContent();
            })
            .WithName("DeleteBill")
            .WithSummary("Delete a bill.");
    }

    private static CreateBillInput ToCreateInput(CreateBillRequest request)
    {
        return new CreateBillInput(
            request.StoreName,
            request.TransactionDateUtc,
            request.SplitMode,
            request.PrimaryPayerParticipantId,
            (request.Items ?? Array.Empty<BillItemRequest>()).Select(x => new BillItemInput(x.Description, x.Amount, x.ResponsibleParticipantIds ?? Array.Empty<Guid>())).ToArray(),
            (request.Fees ?? Array.Empty<BillFeeRequest>()).Select(x => new BillFeeInput(x.Name, x.FeeType, x.Value)).ToArray(),
            (request.Participants ?? Array.Empty<BillParticipantRequest>()).Select(x => new BillParticipantInput(x.ParticipantId, x.Weight)).ToArray(),
            (request.ExtraContributions ?? Array.Empty<BillContributionRequest>()).Select(x => new BillContributionInput(x.ParticipantId, x.Amount)).ToArray());
    }

    private static UpdateBillInput ToUpdateInput(UpdateBillRequest request)
    {
        return new UpdateBillInput(
            request.StoreName,
            request.TransactionDateUtc,
            request.SplitMode,
            request.PrimaryPayerParticipantId,
            (request.Items ?? Array.Empty<BillItemRequest>()).Select(x => new BillItemInput(x.Description, x.Amount, x.ResponsibleParticipantIds ?? Array.Empty<Guid>())).ToArray(),
            (request.Fees ?? Array.Empty<BillFeeRequest>()).Select(x => new BillFeeInput(x.Name, x.FeeType, x.Value)).ToArray(),
            (request.Participants ?? Array.Empty<BillParticipantRequest>()).Select(x => new BillParticipantInput(x.ParticipantId, x.Weight)).ToArray(),
            (request.ExtraContributions ?? Array.Empty<BillContributionRequest>()).Select(x => new BillContributionInput(x.ParticipantId, x.Amount)).ToArray());
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
