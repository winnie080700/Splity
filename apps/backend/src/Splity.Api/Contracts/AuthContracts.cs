namespace Splity.Api.Contracts;

public sealed record RegisterRequest(string Name, string Username, string Email, string Password);

public sealed record LoginRequest(string Email, string Password);

public sealed record ForgotPasswordRequest(string Email);

public sealed record UpdateProfileRequest(string Name);

public sealed record UpdatePaymentProfileRequest(
    string? PayeeName,
    string? PaymentMethod,
    string? AccountName,
    string? AccountNumber,
    string? Notes,
    string? PaymentQrDataUrl);

public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword, string ConfirmNewPassword);

public sealed record VerifyEmailRequest(string Code);

public sealed record SyncCurrentUserRequest(
    string Email,
    string? Username,
    string? Name,
    bool IsEmailVerified);
