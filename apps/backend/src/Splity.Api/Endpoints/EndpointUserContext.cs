using Splity.Application.Services;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace Splity.Api.Endpoints;

internal static class EndpointUserContext
{
    public static async Task<Guid> ResolveUserIdAsync(
        ClaimsPrincipal user,
        IAppUserIdentityService identityService,
        CancellationToken cancellationToken)
    {
        return await identityService.ResolveUserIdAsync(GetExternalUserId(user), cancellationToken);
    }

    public static string GetExternalUserId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(raw))
        {
            return raw;
        }

        throw new InvalidOperationException("Authenticated user id is missing.");
    }
}
