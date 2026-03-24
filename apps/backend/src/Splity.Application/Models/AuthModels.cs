namespace Splity.Application.Models;

public sealed record RegisterInput(string Name, string Email, string Password);

public sealed record LoginInput(string Email, string Password);

public sealed record ForgotPasswordInput(string Email);

public sealed record UpdateProfileInput(string Name);

public sealed record ChangePasswordInput(string CurrentPassword, string NewPassword);

public sealed record VerifyEmailInput(string Code);

public sealed record AuthUserDto(
    Guid Id,
    string Name,
    string Email,
    bool IsEmailVerified,
    DateTime? EmailVerifiedAtUtc,
    DateTime? EmailVerificationPendingUntilUtc);

public sealed record AuthResultDto(string AccessToken, AuthUserDto User);
