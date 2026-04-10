namespace Splity.Application.Models;

public sealed record RegisterInput(string Name, string Username, string Email, string Password);

public sealed record LoginInput(string Email, string Password);

public sealed record ForgotPasswordInput(string Email);

public sealed record UpdateProfileInput(string Name);

public sealed record UpdatePaymentProfileInput(
    string? PayeeName,
    string? PaymentMethod,
    string? AccountName,
    string? AccountNumber,
    string? Notes,
    string? PaymentQrDataUrl);

public sealed record ChangePasswordInput(string CurrentPassword, string NewPassword);

public sealed record VerifyEmailInput(string Code);

public sealed record AuthPaymentProfileDto(
    string PayeeName,
    string PaymentMethod,
    string AccountName,
    string AccountNumber,
    string Notes,
    string PaymentQrDataUrl);

public sealed record AuthUserDto(
    Guid Id,
    string Name,
    string? Username,
    string Email,
    AuthPaymentProfileDto PaymentProfile,
    bool IsEmailVerified,
    DateTime? EmailVerifiedAtUtc,
    DateTime? EmailVerificationPendingUntilUtc);

public sealed record UserLookupDto(Guid Id, string Name, string? Username);

public sealed record AuthResultDto(string AccessToken, AuthUserDto User);
