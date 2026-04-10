using Microsoft.IdentityModel.Tokens;

namespace Splity.Infrastructure.Identity;

public sealed class ClerkJwksProvider(HttpClient httpClient, string jwksUrl)
{
    private readonly SemaphoreSlim refreshLock = new(1, 1);
    private IReadOnlyCollection<SecurityKey> cachedKeys = Array.Empty<SecurityKey>();
    private DateTimeOffset cacheExpiresAtUtc = DateTimeOffset.MinValue;

    public async Task<IReadOnlyCollection<SecurityKey>> GetSigningKeysAsync(CancellationToken cancellationToken)
    {
        if (DateTimeOffset.UtcNow < cacheExpiresAtUtc && cachedKeys.Count > 0)
        {
            return cachedKeys;
        }

        await refreshLock.WaitAsync(cancellationToken);
        try
        {
            if (DateTimeOffset.UtcNow < cacheExpiresAtUtc && cachedKeys.Count > 0)
            {
                return cachedKeys;
            }

            using var response = await httpClient.GetAsync(jwksUrl, cancellationToken);
            response.EnsureSuccessStatusCode();

            var payload = await response.Content.ReadAsStringAsync(cancellationToken);
            var keySet = new JsonWebKeySet(payload);
            cachedKeys = keySet.GetSigningKeys().ToArray();
            cacheExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(15);
            return cachedKeys;
        }
        finally
        {
            refreshLock.Release();
        }
    }
}
