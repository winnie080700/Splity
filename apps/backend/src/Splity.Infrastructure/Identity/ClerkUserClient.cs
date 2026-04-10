using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Splity.Application.Abstractions;
using Splity.Application.Exceptions;

namespace Splity.Infrastructure.Identity;

public sealed class ClerkUserClient(HttpClient httpClient, string apiUrl, string secretKey) : IExternalIdentityUserProvider
{
    public async Task<ExternalIdentityUser> GetUserAsync(string externalUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("Clerk:SecretKey is required.");
        }

        if (string.IsNullOrWhiteSpace(apiUrl))
        {
            throw new InvalidOperationException("Clerk:ApiUrl is required.");
        }

        using var request = new HttpRequestMessage(HttpMethod.Get, $"{apiUrl.TrimEnd('/')}/v1/users/{Uri.EscapeDataString(externalUserId)}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new ExternalServiceException(
                "Unable to read your Clerk account details right now.",
                "auth_identity_sync_failed");
        }

        var payload = await response.Content.ReadFromJsonAsync<ClerkUserResponse>(cancellationToken);
        if (payload is null)
        {
            throw new ExternalServiceException(
                "Unable to read your Clerk account details right now.",
                "auth_identity_sync_failed");
        }

        var primaryEmail = ResolvePrimaryEmail(payload);
        if (string.IsNullOrWhiteSpace(primaryEmail?.EmailAddress))
        {
            throw new ExternalServiceException(
                "Your Clerk account does not have a primary email address configured.",
                "auth_identity_email_missing");
        }

        return new ExternalIdentityUser(
            payload.Id,
            primaryEmail.EmailAddress.Trim().ToLowerInvariant(),
            payload.Username?.Trim(),
            BuildDisplayName(payload, primaryEmail.EmailAddress),
            string.Equals(primaryEmail.Verification?.Status, "verified", StringComparison.OrdinalIgnoreCase));
    }

    private static ClerkEmailAddressResponse? ResolvePrimaryEmail(ClerkUserResponse payload)
    {
        if (payload.EmailAddresses is null || payload.EmailAddresses.Count == 0)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(payload.PrimaryEmailAddressId))
        {
            var primaryEmail = payload.EmailAddresses.FirstOrDefault(email =>
                string.Equals(email.Id, payload.PrimaryEmailAddressId, StringComparison.Ordinal));
            if (primaryEmail is not null)
            {
                return primaryEmail;
            }
        }

        return payload.EmailAddresses[0];
    }

    private static string BuildDisplayName(ClerkUserResponse payload, string fallbackEmail)
    {
        var pieces = new[] { payload.FirstName?.Trim(), payload.LastName?.Trim() }
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .ToArray();

        if (pieces.Length > 0)
        {
            return string.Join(" ", pieces);
        }

        if (!string.IsNullOrWhiteSpace(payload.Username))
        {
            return payload.Username.Trim();
        }

        return fallbackEmail.Split("@", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];
    }

    private sealed class ClerkUserResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("username")]
        public string? Username { get; set; }

        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }

        [JsonPropertyName("last_name")]
        public string? LastName { get; set; }

        [JsonPropertyName("primary_email_address_id")]
        public string? PrimaryEmailAddressId { get; set; }

        [JsonPropertyName("email_addresses")]
        public List<ClerkEmailAddressResponse> EmailAddresses { get; set; } = [];
    }

    private sealed class ClerkEmailAddressResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("email_address")]
        public string EmailAddress { get; set; } = string.Empty;

        [JsonPropertyName("verification")]
        public ClerkVerificationResponse? Verification { get; set; }
    }

    private sealed class ClerkVerificationResponse
    {
        [JsonPropertyName("status")]
        public string? Status { get; set; }
    }
}
