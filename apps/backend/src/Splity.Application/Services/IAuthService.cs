using Splity.Application.Models;

namespace Splity.Application.Services;

public interface IAuthService
{
    Task<AuthResultDto> RegisterAsync(RegisterInput input, CancellationToken cancellationToken);
    Task<AuthResultDto> LoginAsync(LoginInput input, CancellationToken cancellationToken);
    Task ForgotPasswordAsync(ForgotPasswordInput input, CancellationToken cancellationToken);
    Task<AuthUserDto> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken);
    Task<AuthUserDto> UpdateProfileAsync(Guid userId, UpdateProfileInput input, CancellationToken cancellationToken);
    Task ChangePasswordAsync(Guid userId, ChangePasswordInput input, CancellationToken cancellationToken);
    Task<AuthUserDto> SendEmailVerificationAsync(Guid userId, CancellationToken cancellationToken);
    Task<AuthUserDto> VerifyEmailAsync(Guid userId, VerifyEmailInput input, CancellationToken cancellationToken);
}
