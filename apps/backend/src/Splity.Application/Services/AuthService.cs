using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;

namespace Splity.Application.Services;

public sealed class AuthService(
    IAppUserRepository appUserRepository,
    IPasswordHasher passwordHasher,
    IPasswordResetEmailSender passwordResetEmailSender,
    IEmailVerificationSender emailVerificationSender,
    ITokenProvider tokenProvider,
    IUnitOfWork unitOfWork) : IAuthService
{
    private static readonly char[] TemporaryPasswordCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%".ToCharArray();
    private static readonly Regex UsernamePattern = new("^[a-z0-9._-]{3,30}$", RegexOptions.Compiled);

    public async Task<AuthResultDto> RegisterAsync(RegisterInput input, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(input.Email);
        var normalizedUsername = NormalizeUsername(input.Username);
        ValidateName(input.Name);
        ValidatePassword(input.Password);

        if (await appUserRepository.GetByEmailAsync(normalizedEmail, cancellationToken) is not null)
        {
            throw new DomainValidationException("This email is already registered.", "auth_email_exists");
        }

        if (await appUserRepository.GetByUsernameAsync(normalizedUsername, cancellationToken) is not null)
        {
            throw new DomainValidationException("This username is already registered.", "auth_username_exists");
        }

        var password = passwordHasher.HashPassword(input.Password);
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Name = input.Name.Trim(),
            Username = normalizedUsername,
            Email = normalizedEmail,
            PasswordHash = password.Hash,
            PasswordSalt = password.Salt,
            CreatedAtUtc = DateTime.UtcNow
        };

        await appUserRepository.AddAsync(user, cancellationToken);
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToAuthResult(user);
    }

    public async Task<AuthResultDto> LoginAsync(LoginInput input, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(input.Email);
        var user = await appUserRepository.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            throw new DomainValidationException("Invalid email or password.", "auth_invalid_credentials");
        }

        EnsureLocalPasswordAuthenticationAvailable(user);
        if (!passwordHasher.VerifyPassword(input.Password, user.PasswordHash, user.PasswordSalt))
        {
            throw new DomainValidationException("Invalid email or password.", "auth_invalid_credentials");
        }

        return ToAuthResult(user);
    }

    public async Task ForgotPasswordAsync(ForgotPasswordInput input, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(input.Email);
        var user = await appUserRepository.GetByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            return;
        }

        EnsureLocalPasswordAuthenticationAvailable(user);

        var temporaryPassword = GenerateTemporaryPassword();
        var previousHash = user.PasswordHash;
        var previousSalt = user.PasswordSalt;
        var nextPassword = passwordHasher.HashPassword(temporaryPassword);

        user.PasswordHash = nextPassword.Hash;
        user.PasswordSalt = nextPassword.Salt;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await passwordResetEmailSender.SendTemporaryPasswordAsync(
                user.Email,
                user.Name,
                temporaryPassword,
                cancellationToken);
        }
        catch (Exception exception)
        {
            user.PasswordHash = previousHash;
            user.PasswordSalt = previousSalt;

            try
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch
            {
            }

            if (exception is ExternalServiceException externalServiceException)
            {
                throw externalServiceException;
            }

            throw new ExternalServiceException(
                "Unable to send reset email right now. Please try again later.",
                "auth_reset_email_send_failed");
        }
    }

    public async Task<AuthUserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await appUserRepository.GetByIdAsync(userId, cancellationToken);
        return ToAuthUser(user);
    }

    public async Task<AuthUserDto> UpdateProfileAsync(Guid userId, UpdateProfileInput input, CancellationToken cancellationToken)
    {
        ValidateName(input.Name);

        var user = await appUserRepository.GetByIdForUpdateAsync(userId, cancellationToken);
        if (user is null)
        {
            throw new EntityNotFoundException("User not found.");
        }

        user.Name = input.Name.Trim();
        await unitOfWork.SaveChangesAsync(cancellationToken);
        return ToAuthUser(user);
    }

    public async Task<AuthUserDto> UpdatePaymentProfileAsync(Guid userId, UpdatePaymentProfileInput input, CancellationToken cancellationToken)
    {
        var user = await appUserRepository.GetByIdForUpdateAsync(userId, cancellationToken);
        if (user is null)
        {
            throw new EntityNotFoundException("User not found.");
        }

        user.DefaultPaymentPayeeName = NormalizeOptionalText(input.PayeeName, 150);
        user.DefaultPaymentMethod = NormalizeOptionalText(input.PaymentMethod, 120);
        user.DefaultPaymentAccountName = NormalizeOptionalText(input.AccountName, 150);
        user.DefaultPaymentAccountNumber = NormalizeOptionalText(input.AccountNumber, 120);
        user.DefaultPaymentNotes = NormalizeOptionalText(input.Notes, 2000);
        user.DefaultPaymentQrDataUrl = NormalizeOptionalLongText(input.PaymentQrDataUrl);

        await unitOfWork.SaveChangesAsync(cancellationToken);
        return ToAuthUser(user);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordInput input, CancellationToken cancellationToken)
    {
        var user = await appUserRepository.GetByIdForUpdateAsync(userId, cancellationToken);
        if (user is null)
        {
            throw new EntityNotFoundException("User not found.");
        }

        EnsureLocalPasswordAuthenticationAvailable(user);

        if (!passwordHasher.VerifyPassword(input.CurrentPassword, user.PasswordHash, user.PasswordSalt))
        {
            throw new DomainValidationException("Current password is incorrect.", "auth_current_password_invalid");
        }

        ValidatePassword(input.NewPassword);

        if (passwordHasher.VerifyPassword(input.NewPassword, user.PasswordHash, user.PasswordSalt))
        {
            throw new DomainValidationException("New password must be different from the current password.", "auth_new_password_same_as_current");
        }

        var nextPassword = passwordHasher.HashPassword(input.NewPassword);
        user.PasswordHash = nextPassword.Hash;
        user.PasswordSalt = nextPassword.Salt;

        await unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<AuthUserDto> SendEmailVerificationAsync(Guid userId, CancellationToken cancellationToken)
    {
        var user = await appUserRepository.GetByIdForUpdateAsync(userId, cancellationToken);
        if (user is null)
        {
            throw new EntityNotFoundException("User not found.");
        }

        EnsureLocalPasswordAuthenticationAvailable(user);

        if (user.EmailVerifiedAtUtc.HasValue)
        {
            return ToAuthUser(user);
        }

        var verificationCode = GenerateVerificationCode();
        var expiresAtUtc = DateTime.UtcNow.AddMinutes(10);
        var previousHash = user.PendingEmailVerificationCodeHash;
        var previousExpiresAtUtc = user.PendingEmailVerificationExpiresAtUtc;

        user.PendingEmailVerificationCodeHash = HashVerificationCode(verificationCode);
        user.PendingEmailVerificationExpiresAtUtc = expiresAtUtc;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        try
        {
            await emailVerificationSender.SendVerificationCodeAsync(
                user.Email,
                user.Name,
                verificationCode,
                cancellationToken);
        }
        catch (Exception exception)
        {
            user.PendingEmailVerificationCodeHash = previousHash;
            user.PendingEmailVerificationExpiresAtUtc = previousExpiresAtUtc;

            try
            {
                await unitOfWork.SaveChangesAsync(cancellationToken);
            }
            catch
            {
            }

            if (exception is ExternalServiceException externalServiceException)
            {
                throw externalServiceException;
            }

            throw new ExternalServiceException(
                "Unable to send verification email right now. Please try again later.",
                "auth_email_verification_send_failed");
        }

        return ToAuthUser(user);
    }

    public async Task<AuthUserDto> VerifyEmailAsync(Guid userId, VerifyEmailInput input, CancellationToken cancellationToken)
    {
        var user = await appUserRepository.GetByIdForUpdateAsync(userId, cancellationToken);
        if (user is null)
        {
            throw new EntityNotFoundException("User not found.");
        }

        EnsureLocalPasswordAuthenticationAvailable(user);

        if (user.EmailVerifiedAtUtc.HasValue)
        {
            return ToAuthUser(user);
        }

        var code = input.Code?.Trim() ?? string.Empty;
        if (code.Length == 0)
        {
            throw new DomainValidationException("Verification code is required.", "auth_email_verification_code_required");
        }

        if (user.PendingEmailVerificationExpiresAtUtc is null ||
            user.PendingEmailVerificationExpiresAtUtc <= DateTime.UtcNow ||
            string.IsNullOrWhiteSpace(user.PendingEmailVerificationCodeHash))
        {
            throw new DomainValidationException("Verification code has expired. Please request a new one.", "auth_email_verification_code_expired");
        }

        if (!string.Equals(HashVerificationCode(code), user.PendingEmailVerificationCodeHash, StringComparison.Ordinal))
        {
            throw new DomainValidationException("Verification code is invalid.", "auth_email_verification_code_invalid");
        }

        user.EmailVerifiedAtUtc = DateTime.UtcNow;
        user.PendingEmailVerificationCodeHash = null;
        user.PendingEmailVerificationExpiresAtUtc = null;
        await unitOfWork.SaveChangesAsync(cancellationToken);

        return ToAuthUser(user);
    }

    public async Task<UserLookupDto?> FindUserByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        var normalizedUsername = NormalizeUsername(username);
        var user = await appUserRepository.GetByUsernameAsync(normalizedUsername, cancellationToken);
        return user is null ? null : new UserLookupDto(user.Id, user.Name, user.Username);
    }

    private AuthResultDto ToAuthResult(AppUser user)
    {
        return new AuthResultDto(
            tokenProvider.CreateAccessToken(user),
            ToAuthUser(user));
    }

    private AuthUserDto ToAuthUser(AppUser? user)
    {
        if (user is null)
        {
            throw new EntityNotFoundException("User not found.");
        }

        return new AuthUserDto(
            user.Id,
            user.Name,
            user.Username,
            user.Email,
            ToPaymentProfile(user),
            user.EmailVerifiedAtUtc.HasValue,
            user.EmailVerifiedAtUtc,
            user.PendingEmailVerificationExpiresAtUtc);
    }

    private static string NormalizeEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new DomainValidationException("Email is required.", "auth_email_required");
        }

        try
        {
            return new MailAddress(email.Trim()).Address.ToLowerInvariant();
        }
        catch (FormatException)
        {
            throw new DomainValidationException("A valid email address is required.", "auth_email_invalid");
        }
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainValidationException("Name is required.", "auth_name_required");
        }
    }

    private static string NormalizeUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            throw new DomainValidationException("Username is required.", "auth_username_required");
        }

        var normalized = username.Trim();
        while (normalized.StartsWith("@", StringComparison.Ordinal))
        {
            normalized = normalized[1..];
        }

        normalized = normalized.Trim().ToLowerInvariant();

        if (!UsernamePattern.IsMatch(normalized))
        {
            throw new DomainValidationException(
                "Username must be 3-30 characters and use only letters, numbers, dot, underscore, or dash.",
                "auth_username_invalid");
        }

        return normalized;
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Trim().Length < 8)
        {
            throw new DomainValidationException("Password must be at least 8 characters.", "auth_password_too_short");
        }
    }

    private static void EnsureLocalPasswordAuthenticationAvailable(AppUser user)
    {
        if (!string.IsNullOrWhiteSpace(user.ClerkUserId))
        {
            throw new DomainValidationException(
                "This account is managed by Clerk. Update your credentials from the Clerk flow instead.",
                "auth_managed_by_clerk");
        }
    }

    private static string? NormalizeOptionalText(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalized = value.Trim();
        return normalized.Length <= maxLength ? normalized : normalized[..maxLength];
    }

    private static string? NormalizeOptionalLongText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static AuthPaymentProfileDto ToPaymentProfile(AppUser user)
    {
        return new AuthPaymentProfileDto(
            user.DefaultPaymentPayeeName?.Trim() ?? string.Empty,
            user.DefaultPaymentMethod?.Trim() ?? string.Empty,
            user.DefaultPaymentAccountName?.Trim() ?? string.Empty,
            user.DefaultPaymentAccountNumber?.Trim() ?? string.Empty,
            user.DefaultPaymentNotes?.Trim() ?? string.Empty,
            user.DefaultPaymentQrDataUrl?.Trim() ?? string.Empty);
    }

    private static string GenerateTemporaryPassword()
    {
        const int passwordLength = 12;
        Span<byte> randomBytes = stackalloc byte[passwordLength];
        RandomNumberGenerator.Fill(randomBytes);

        var password = new char[passwordLength];
        for (var index = 0; index < passwordLength; index++)
        {
            password[index] = TemporaryPasswordCharacters[randomBytes[index] % TemporaryPasswordCharacters.Length];
        }

        return new string(password);
    }

    private static string GenerateVerificationCode()
    {
        Span<byte> randomBytes = stackalloc byte[4];
        RandomNumberGenerator.Fill(randomBytes);
        var numericValue = BitConverter.ToUInt32(randomBytes) % 1_000_000;
        return numericValue.ToString("D6");
    }

    private static string HashVerificationCode(string code)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(code));
        return Convert.ToHexString(bytes);
    }
}
