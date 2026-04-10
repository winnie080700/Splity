using System.Text.RegularExpressions;
using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Domain.Entities;

namespace Splity.Application.Services;

public sealed class AppUserIdentityService(
    IAppUserRepository appUserRepository,
    IExternalIdentityUserProvider externalIdentityUserProvider,
    IPasswordHasher passwordHasher,
    IUnitOfWork unitOfWork) : IAppUserIdentityService
{
    private static readonly Regex UsernameCleanupPattern = new("[^a-z0-9._-]+", RegexOptions.Compiled);
    private static readonly Regex UsernameValidationPattern = new("^[a-z0-9._-]{3,30}$", RegexOptions.Compiled);

    public async Task<Guid> ResolveUserIdAsync(string externalUserId, CancellationToken cancellationToken, bool refreshProfile = false)
    {
        if (string.IsNullOrWhiteSpace(externalUserId))
        {
            throw new InvalidOperationException("Authenticated external user id is missing.");
        }

        var existingUser = await appUserRepository.GetByClerkUserIdAsync(externalUserId, cancellationToken);
        if (existingUser is not null)
        {
            if (refreshProfile)
            {
                var externalUser = await externalIdentityUserProvider.GetUserAsync(externalUserId, cancellationToken);
                if (await ApplyExternalProfileAsync(existingUser, externalUser, cancellationToken))
                {
                    await unitOfWork.SaveChangesAsync(cancellationToken);
                }
            }

            return existingUser.Id;
        }

        var identityUser = await externalIdentityUserProvider.GetUserAsync(externalUserId, cancellationToken);
        return await AttachOrCreateUserAsync(externalUserId, identityUser, cancellationToken);
    }

    public async Task<Guid?> TryResolveUserIdAsync(string? externalUserId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(externalUserId))
        {
            return null;
        }

        return await ResolveUserIdAsync(externalUserId, cancellationToken);
    }

    public async Task<Guid> SyncUserProfileAsync(ExternalIdentityUser externalUser, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(externalUser.UserId))
        {
            throw new InvalidOperationException("Authenticated external user id is missing.");
        }

        var existingUser = await appUserRepository.GetByClerkUserIdAsync(externalUser.UserId, cancellationToken);
        if (existingUser is not null)
        {
            if (await ApplyExternalProfileAsync(existingUser, externalUser, cancellationToken))
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }

            return existingUser.Id;
        }

        return await AttachOrCreateUserAsync(externalUser.UserId, externalUser, cancellationToken);
    }

    private async Task<Guid> AttachOrCreateUserAsync(
        string externalUserId,
        ExternalIdentityUser identityUser,
        CancellationToken cancellationToken)
    {
        var existingByEmail = await appUserRepository.GetByEmailAsync(identityUser.Email, cancellationToken);

        if (existingByEmail is not null)
        {
            if (!string.IsNullOrWhiteSpace(existingByEmail.ClerkUserId) &&
                !string.Equals(existingByEmail.ClerkUserId, externalUserId, StringComparison.Ordinal))
            {
                throw new DomainValidationException(
                    "This email address is already linked to another account.",
                    "auth_account_conflict");
            }

            existingByEmail.ClerkUserId = externalUserId;
            await ApplyExternalProfileAsync(existingByEmail, identityUser, cancellationToken);
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return existingByEmail.Id;
        }

        var password = passwordHasher.HashPassword(Guid.NewGuid().ToString("N"));
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            ClerkUserId = externalUserId,
            Name = BuildDisplayName(identityUser),
            Username = await ResolveUniqueUsernameAsync(identityUser.Username, identityUser.Email, null, cancellationToken),
            Email = identityUser.Email,
            PasswordHash = password.Hash,
            PasswordSalt = password.Salt,
            EmailVerifiedAtUtc = identityUser.IsEmailVerified ? DateTime.UtcNow : null,
            CreatedAtUtc = DateTime.UtcNow
        };

        await appUserRepository.AddAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return user.Id;
    }

    private async Task<bool> ApplyExternalProfileAsync(
        AppUser user,
        ExternalIdentityUser externalUser,
        CancellationToken cancellationToken)
    {
        var hasChanges = false;

        if (!string.Equals(user.Email, externalUser.Email, StringComparison.OrdinalIgnoreCase))
        {
            var conflictingUser = await appUserRepository.GetByEmailAsync(externalUser.Email, cancellationToken);
            if (conflictingUser is not null && conflictingUser.Id != user.Id)
            {
                throw new DomainValidationException(
                    "This email address is already linked to another account.",
                    "auth_account_conflict");
            }

            user.Email = externalUser.Email;
            hasChanges = true;
        }

        if (string.IsNullOrWhiteSpace(user.ClerkUserId))
        {
            user.ClerkUserId = externalUser.UserId;
            hasChanges = true;
        }

        if (string.IsNullOrWhiteSpace(user.Name))
        {
            user.Name = BuildDisplayName(externalUser);
            hasChanges = true;
        }

        if (string.IsNullOrWhiteSpace(user.Username))
        {
            user.Username = await ResolveUniqueUsernameAsync(externalUser.Username, externalUser.Email, user.Id, cancellationToken);
            hasChanges = true;
        }

        DateTime? nextVerifiedAtUtc = externalUser.IsEmailVerified
            ? user.EmailVerifiedAtUtc ?? DateTime.UtcNow
            : null;

        if (user.EmailVerifiedAtUtc != nextVerifiedAtUtc)
        {
            user.EmailVerifiedAtUtc = nextVerifiedAtUtc;
            if (!externalUser.IsEmailVerified)
            {
                user.PendingEmailVerificationCodeHash = null;
                user.PendingEmailVerificationExpiresAtUtc = null;
            }

            hasChanges = true;
        }

        return hasChanges;
    }

    private static string BuildDisplayName(ExternalIdentityUser externalUser)
    {
        if (!string.IsNullOrWhiteSpace(externalUser.DisplayName))
        {
            return externalUser.DisplayName.Trim();
        }

        return externalUser.Email.Split("@", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];
    }

    private async Task<string> ResolveUniqueUsernameAsync(
        string? preferredUsername,
        string email,
        Guid? currentUserId,
        CancellationToken cancellationToken)
    {
        var baseUsername = NormalizePreferredUsername(preferredUsername, email);
        if (await IsUsernameAvailableAsync(baseUsername, currentUserId, cancellationToken))
        {
            return baseUsername;
        }

        for (var suffix = 1; suffix <= 999; suffix++)
        {
            var candidate = BuildUsernameWithSuffix(baseUsername, suffix);
            if (await IsUsernameAvailableAsync(candidate, currentUserId, cancellationToken))
            {
                return candidate;
            }
        }

        throw new DomainValidationException(
            "Unable to generate a unique username for this account.",
            "auth_username_exists");
    }

    private async Task<bool> IsUsernameAvailableAsync(
        string username,
        Guid? currentUserId,
        CancellationToken cancellationToken)
    {
        var existingUser = await appUserRepository.GetByUsernameAsync(username, cancellationToken);
        return existingUser is null || existingUser.Id == currentUserId;
    }

    private static string NormalizePreferredUsername(string? preferredUsername, string email)
    {
        var candidate = preferredUsername?.Trim() ?? string.Empty;
        while (candidate.StartsWith("@", StringComparison.Ordinal))
        {
            candidate = candidate[1..];
        }

        if (candidate.Length == 0)
        {
            candidate = email.Split("@", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)[0];
        }

        candidate = UsernameCleanupPattern.Replace(candidate.ToLowerInvariant(), "-").Trim('-', '.', '_');
        if (candidate.Length == 0)
        {
            candidate = "user";
        }

        if (candidate.Length > 30)
        {
            candidate = candidate[..30].TrimEnd('-', '.', '_');
        }

        while (candidate.Length < 3)
        {
            candidate += "x";
        }

        if (UsernameValidationPattern.IsMatch(candidate))
        {
            return candidate;
        }

        var sanitized = UsernameCleanupPattern.Replace(candidate, "-").Trim('-', '.', '_');
        if (sanitized.Length == 0)
        {
            sanitized = "user";
        }

        if (sanitized.Length > 30)
        {
            sanitized = sanitized[..30].TrimEnd('-', '.', '_');
        }

        while (sanitized.Length < 3)
        {
            sanitized += "x";
        }

        return sanitized;
    }

    private static string BuildUsernameWithSuffix(string baseUsername, int suffix)
    {
        var suffixText = suffix.ToString();
        var maxBaseLength = Math.Max(3, 30 - suffixText.Length - 1);
        var trimmedBase = baseUsername.Length > maxBaseLength
            ? baseUsername[..maxBaseLength].TrimEnd('-', '.', '_')
            : baseUsername;

        if (trimmedBase.Length == 0)
        {
            trimmedBase = "usr";
        }

        return $"{trimmedBase}-{suffixText}";
    }
}
