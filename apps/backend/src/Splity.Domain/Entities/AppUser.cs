namespace Splity.Domain.Entities;

public sealed class AppUser
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Group> CreatedGroups { get; set; } = new List<Group>();
}
