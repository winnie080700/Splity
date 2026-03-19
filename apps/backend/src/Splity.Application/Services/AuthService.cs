using System.Net.Mail;
using Splity.Application.Abstractions;
using Splity.Application.Exceptions;
using Splity.Application.Models;
using Splity.Domain.Entities;

namespace Splity.Application.Services;

public sealed class AuthService(
    IAppUserRepository appUserRepository,
    IPasswordHasher passwordHasher,
    ITokenProvider tokenProvider,
    IUnitOfWork unitOfWork) : IAuthService
{
    public async Task<AuthResultDto> RegisterAsync(RegisterInput input, CancellationToken cancellationToken)
    {
        var normalizedEmail = NormalizeEmail(input.Email);
        ValidateName(input.Name);
        ValidatePassword(input.Password);

        if (await appUserRepository.GetByEmailAsync(normalizedEmail, cancellationToken) is not null)
        {
            throw new DomainValidationException("This email is already registered.");
        }

        var password = passwordHasher.HashPassword(input.Password);
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            Name = input.Name.Trim(),
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
        if (user is null || !passwordHasher.VerifyPassword(input.Password, user.PasswordHash, user.PasswordSalt))
        {
            throw new DomainValidationException("Invalid email or password.");
        }

        return ToAuthResult(user);
    }

    private AuthResultDto ToAuthResult(AppUser user)
    {
        return new AuthResultDto(
            tokenProvider.CreateAccessToken(user),
            new AuthUserDto(user.Id, user.Name, user.Email));
    }

    private static string NormalizeEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new DomainValidationException("Email is required.");
        }

        try
        {
            return new MailAddress(email.Trim()).Address.ToLowerInvariant();
        }
        catch (FormatException)
        {
            throw new DomainValidationException("A valid email address is required.");
        }
    }

    private static void ValidateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainValidationException("Name is required.");
        }
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrWhiteSpace(password) || password.Trim().Length < 8)
        {
            throw new DomainValidationException("Password must be at least 8 characters.");
        }
    }
}
