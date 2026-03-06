using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;

namespace Splity.Api.Endpoints;

public static class ParticipantEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups/{groupId:guid}/participants").WithTags("Participants");

        group.MapPost("/", async (Guid groupId, CreateParticipantRequest request, IParticipantsService service, CancellationToken ct) =>
            {
                var result = await service.CreateAsync(groupId, new CreateParticipantInput(request.Name), ct);
                return Results.Created($"/api/groups/{groupId}/participants/{result.Id}", result);
            })
            .WithName("CreateParticipant")
            .WithSummary("Create a participant in a group.");

        group.MapGet("/", async (Guid groupId, IParticipantsService service, CancellationToken ct) =>
            {
                var result = await service.ListAsync(groupId, ct);
                return Results.Ok(result);
            })
            .WithName("ListParticipants")
            .WithSummary("List participants by group.");
    }
}
