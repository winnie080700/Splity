namespace Splity.Application.Models;

public sealed record RegisterInput(string Name, string Email, string Password);

public sealed record LoginInput(string Email, string Password);

public sealed record AuthUserDto(Guid Id, string Name, string Email);

public sealed record AuthResultDto(string AccessToken, AuthUserDto User);
