using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;

namespace Splity.Infrastructure.Persistence;

public sealed class SplityDbContext(DbContextOptions<SplityDbContext> options)
    : DbContext(options), IUnitOfWork
{
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<Participant> Participants => Set<Participant>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<BillItem> BillItems => Set<BillItem>();
    public DbSet<BillFee> BillFees => Set<BillFee>();
    public DbSet<BillShare> BillShares => Set<BillShare>();
    public DbSet<PaymentContribution> PaymentContributions => Set<PaymentContribution>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Group>(entity =>
        {
            entity.ToTable("groups");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(200).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
        });

        modelBuilder.Entity<Participant>(entity =>
        {
            entity.ToTable("participants");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.HasIndex(x => new { x.GroupId, x.Name }).IsUnique();

            entity.HasOne(x => x.Group)
                .WithMany(x => x.Participants)
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Bill>(entity =>
        {
            entity.ToTable("bills");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.StoreName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.CurrencyCode).HasMaxLength(3).IsRequired();
            entity.Property(x => x.TransactionDateUtc).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();
            entity.HasIndex(x => new { x.GroupId, x.TransactionDateUtc });
            entity.HasIndex(x => new { x.GroupId, x.StoreName });

            entity.HasOne(x => x.Group)
                .WithMany(x => x.Bills)
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BillItem>(entity =>
        {
            entity.ToTable("bill_items");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Description).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();

            entity.HasOne(x => x.Bill)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.BillId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BillFee>(entity =>
        {
            entity.ToTable("bill_fees");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Name).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Value).HasPrecision(18, 2).IsRequired();

            entity.HasOne(x => x.Bill)
                .WithMany(x => x.Fees)
                .HasForeignKey(x => x.BillId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BillShare>(entity =>
        {
            entity.ToTable("bill_shares");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Weight).HasPrecision(18, 4).IsRequired();
            entity.Property(x => x.PreFeeAmount).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.FeeAmount).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.TotalShareAmount).HasPrecision(18, 2).IsRequired();
            entity.HasIndex(x => new { x.BillId, x.ParticipantId }).IsUnique();

            entity.HasOne(x => x.Bill)
                .WithMany(x => x.Shares)
                .HasForeignKey(x => x.BillId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Participant)
                .WithMany(x => x.BillShares)
                .HasForeignKey(x => x.ParticipantId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PaymentContribution>(entity =>
        {
            entity.ToTable("payment_contributions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Amount).HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.HasIndex(x => new { x.BillId, x.ParticipantId });

            entity.HasOne(x => x.Bill)
                .WithMany(x => x.Contributions)
                .HasForeignKey(x => x.BillId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Participant)
                .WithMany(x => x.PaymentContributions)
                .HasForeignKey(x => x.ParticipantId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
