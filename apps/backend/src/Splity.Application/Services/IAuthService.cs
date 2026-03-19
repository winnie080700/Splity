using Splity.Application.Models;

namespace Splity.Application.Services;

public interface IAuthService
{
    Task<AuthResultDto> RegisterAsync(RegisterInput input, CancellationToken cancellationToken);
    Task<AuthResultDto> LoginAsync(LoginInput input, CancellationToken cancellationToken);
}
