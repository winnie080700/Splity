using Splity.Api.Contracts;
using Splity.Application.Models;
using Splity.Application.Services;

namespace Splity.Api.Endpoints;

public static class AuthEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (RegisterRequest request, IAuthService service, CancellationToken ct) =>
            {
                var result = await service.RegisterAsync(new RegisterInput(request.Name, request.Email, request.Password), ct);
                return Results.Ok(result);
            })
            .WithName("Register")
            .WithSummary("Register a local development user.");

        group.MapPost("/login", async (LoginRequest request, IAuthService service, CancellationToken ct) =>
            {
                var result = await service.LoginAsync(new LoginInput(request.Email, request.Password), ct);
                return Results.Ok(result);
            })
            .WithName("Login")
            .WithSummary("Login and receive an access token.");
    }
}
