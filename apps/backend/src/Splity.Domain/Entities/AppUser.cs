namespace Splity.Domain.Entities;

public sealed class AppUser
{
    public Guid Id { get; set; }
    public string? ClerkUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Username { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string PasswordSalt { get; set; } = string.Empty;
    public string? DefaultPaymentPayeeName { get; set; }
    public string? DefaultPaymentMethod { get; set; }
    public string? DefaultPaymentAccountName { get; set; }
    public string? DefaultPaymentAccountNumber { get; set; }
    public string? DefaultPaymentNotes { get; set; }
    public string? DefaultPaymentQrDataUrl { get; set; }
    public DateTime? EmailVerifiedAtUtc { get; set; }
    public string? PendingEmailVerificationCodeHash { get; set; }
    public DateTime? PendingEmailVerificationExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public ICollection<Group> CreatedGroups { get; set; } = new List<Group>();
}
