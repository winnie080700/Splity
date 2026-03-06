using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;

namespace Splity.Api.Endpoints;

public static class GroupEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/groups").WithTags("Groups");

        group.MapPost("/", async (CreateGroupRequest request, IGroupsService service, CancellationToken ct) =>
            {
                var result = await service.CreateAsync(new CreateGroupInput(request.Name), ct);
                return Results.Created($"/api/groups/{result.Id}", result);
            })
            .WithName("CreateGroup")
            .WithSummary("Create a local demo group.");
    }
}
