using Splity.Domain.Entities;

namespace Splity.Application.Abstractions;

public interface ITokenProvider
{
    string CreateAccessToken(AppUser user);
}
