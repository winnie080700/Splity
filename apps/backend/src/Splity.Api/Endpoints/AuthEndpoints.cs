using Splity.Api.Contracts;
using Splity.Application.Abstractions;
using Splity.Application.Models;
using Splity.Application.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace Splity.Api.Endpoints;

public static class AuthEndpoints
{
    public static void Map(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", async (RegisterRequest request, IAuthService service, CancellationToken ct) =>
            {
                var result = await service.RegisterAsync(new RegisterInput(request.Name, request.Username, request.Email, request.Password), ct);
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

        group.MapPost("/forgot-password", async (ForgotPasswordRequest request, IAuthService service, CancellationToken ct) =>
            {
                await service.ForgotPasswordAsync(new ForgotPasswordInput(request.Email), ct);
                return Results.Ok();
            })
            .WithName("ForgotPassword")
            .WithSummary("Reset a user's password with a temporary password email without disclosing whether the account exists.");

        var authenticated = group.MapGroup(string.Empty)
            .RequireAuthorization();

        authenticated.MapGet("/me", async (ClaimsPrincipal user, IAppUserIdentityService identityService, IAuthService service, CancellationToken ct) =>
            {
                var userId = await identityService.ResolveUserIdAsync(GetExternalUserId(user), ct, refreshProfile: true);
                var result = await service.GetCurrentUserAsync(userId, ct);
                return Results.Ok(result);
            })
            .WithName("GetCurrentUser")
            .WithSummary("Get the current authenticated user.");

        authenticated.MapGet("/users/search", async (string username, IAuthService service, CancellationToken ct) =>
            {
                var result = await service.FindUserByUsernameAsync(username, ct);
                return Results.Ok(result);
            })
            .WithName("SearchUserByUsername")
            .WithSummary("Find an existing user by exact username.");

        authenticated.MapPost("/sync", async (ClaimsPrincipal user, SyncCurrentUserRequest request, IAppUserIdentityService identityService, IAuthService service, CancellationToken ct) =>
            {
                var userId = await identityService.SyncUserProfileAsync(
                    new ExternalIdentityUser(
                        GetExternalUserId(user),
                        request.Email,
                        request.Username,
                        request.Name ?? string.Empty,
                        request.IsEmailVerified),
                    ct);
                var result = await service.GetCurrentUserAsync(userId, ct);
                return Results.Ok(result);
            })
            .WithName("SyncCurrentUser")
            .WithSummary("Upsert the current Clerk-authenticated user into the local application database.");

        authenticated.MapPut("/profile", async (ClaimsPrincipal user, UpdateProfileRequest request, IAppUserIdentityService identityService, IAuthService service, CancellationToken ct) =>
            {
                var userId = await identityService.ResolveUserIdAsync(GetExternalUserId(user), ct);
                var result = await service.UpdateProfileAsync(userId, new UpdateProfileInput(request.Name), ct);
                return Results.Ok(result);
            })
            .WithName("UpdateProfile")
            .WithSummary("Update the current authenticated user's profile.");

        authenticated.MapPut("/payment-profile", async (ClaimsPrincipal user, UpdatePaymentProfileRequest request, IAppUserIdentityService identityService, IAuthService service, CancellationToken ct) =>
            {
                var userId = await identityService.ResolveUserIdAsync(GetExternalUserId(user), ct);
                var result = await service.UpdatePaymentProfileAsync(
                    userId,
                    new UpdatePaymentProfileInput(
                        request.PayeeName,
                        request.PaymentMethod,
                        request.AccountName,
                        request.AccountNumber,
                        request.Notes,
                        request.PaymentQrDataUrl),
                    ct);
                return Results.Ok(result);
            })
            .WithName("UpdatePaymentProfile")
            .WithSummary("Update the current authenticated user's default payment details.");

        authenticated.MapPost("/change-password", async (ClaimsPrincipal user, ChangePasswordRequest request, IAppUserIdentityService identityService, IAuthService service, CancellationToken ct) =>
            {
                if (!string.Equals(request.NewPassword, request.ConfirmNewPassword, StringComparison.Ordinal))
                {
                    throw new Splity.Application.Exceptions.DomainValidationException(
                        "New password and confirmation do not match.",
                        "auth_password_confirmation_mismatch");
                }

                var userId = await identityService.ResolveUserIdAsync(GetExternalUserId(user), ct);
                await service.ChangePasswordAsync(userId, new ChangePasswordInput(request.CurrentPassword, request.NewPassword), ct);
                return Results.Ok();
            })
            .WithName("ChangePassword")
            .WithSummary("Change the current authenticated user's password.");

        authenticated.MapPost("/email-verification/send", async (ClaimsPrincipal user, IAppUserIdentityService identityService, IAuthService service, CancellationToken ct) =>
            {
                var userId = await identityService.ResolveUserIdAsync(GetExternalUserId(user), ct);
                var result = await service.SendEmailVerificationAsync(userId, ct);
                return Results.Ok(result);
            })
            .WithName("SendEmailVerification")
            .WithSummary("Send an email verification code to the current authenticated user.");

        authenticated.MapPost("/email-verification/verify", async (ClaimsPrincipal user, VerifyEmailRequest request, IAppUserIdentityService identityService, IAuthService service, CancellationToken ct) =>
            {
                var userId = await identityService.ResolveUserIdAsync(GetExternalUserId(user), ct);
                var result = await service.VerifyEmailAsync(userId, new VerifyEmailInput(request.Code), ct);
                return Results.Ok(result);
            })
            .WithName("VerifyEmail")
            .WithSummary("Verify the current authenticated user's email address.");
    }

    private static string GetExternalUserId(ClaimsPrincipal user)
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
