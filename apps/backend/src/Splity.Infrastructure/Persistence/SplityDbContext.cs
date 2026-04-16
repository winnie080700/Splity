using Microsoft.EntityFrameworkCore;
using Splity.Application.Abstractions;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

namespace Splity.Infrastructure.Persistence;

public sealed class SplityDbContext(DbContextOptions<SplityDbContext> options)
    : DbContext(options), IUnitOfWork
{
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<Participant> Participants => Set<Participant>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<BillItem> BillItems => Set<BillItem>();
    public DbSet<BillItemResponsibility> BillItemResponsibilities => Set<BillItemResponsibility>();
    public DbSet<BillFee> BillFees => Set<BillFee>();
    public DbSet<BillShare> BillShares => Set<BillShare>();
    public DbSet<PaymentContribution> PaymentContributions => Set<PaymentContribution>();
    public DbSet<SettlementTransferConfirmation> SettlementTransferConfirmations => Set<SettlementTransferConfirmation>();
    public DbSet<SettlementShareLink> SettlementShareLinks => Set<SettlementShareLink>();

    public void ClearTracking()
    {
        ChangeTracker.Clear();
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Group>(entity =>
        {
            entity.ToTable("groups");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(200).IsRequired();
            entity.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(x => x.Status)
                .HasColumnName("status")
                .HasConversion<int>()
                .HasDefaultValue(GroupStatus.Unresolved)
                .IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();

            entity.HasOne(x => x.CreatedByUser)
                .WithMany(x => x.CreatedGroups)
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("app_users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ClerkUserId).HasColumnName("clerk_user_id").HasMaxLength(100);
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Username).HasColumnName("username").HasMaxLength(50);
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(200).IsRequired();
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(200).IsRequired();
            entity.Property(x => x.PasswordSalt).HasColumnName("password_salt").HasMaxLength(200).IsRequired();
            entity.Property(x => x.DefaultPaymentPayeeName).HasColumnName("default_payment_payee_name").HasMaxLength(150);
            entity.Property(x => x.DefaultPaymentMethod).HasColumnName("default_payment_method").HasMaxLength(120);
            entity.Property(x => x.DefaultPaymentAccountName).HasColumnName("default_payment_account_name").HasMaxLength(150);
            entity.Property(x => x.DefaultPaymentAccountNumber).HasColumnName("default_payment_account_number").HasMaxLength(120);
            entity.Property(x => x.DefaultPaymentNotes).HasColumnName("default_payment_notes").HasMaxLength(2000);
            entity.Property(x => x.DefaultPaymentQrDataUrl).HasColumnName("default_payment_qr_data_url").HasColumnType("longtext");
            entity.Property(x => x.EmailVerifiedAtUtc).HasColumnName("email_verified_at_utc");
            entity.Property(x => x.PendingEmailVerificationCodeHash)
                .HasColumnName("pending_email_verification_code_hash")
                .HasMaxLength(128);
            entity.Property(x => x.PendingEmailVerificationExpiresAtUtc).HasColumnName("pending_email_verification_expires_at_utc");
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
            entity.HasIndex(x => x.ClerkUserId).IsUnique();
            entity.HasIndex(x => x.Email).IsUnique();
            entity.HasIndex(x => x.Username).IsUnique();
        });

        modelBuilder.Entity<Participant>(entity =>
        {
            entity.ToTable("participants");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.GroupId).HasColumnName("group_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Username).HasColumnName("username").HasMaxLength(50);
            entity.Property(x => x.InvitedUserId).HasColumnName("invited_user_id");
            entity.Property(x => x.InvitationStatus)
                .HasColumnName("invitation_status")
                .HasConversion<int>()
                .HasDefaultValue(ParticipantInvitationStatus.None)
                .IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
            entity.HasIndex(x => new { x.GroupId, x.Name }).IsUnique();

            entity.HasOne(x => x.Group)
                .WithMany(x => x.Participants)
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.InvitedUser)
                .WithMany()
                .HasForeignKey(x => x.InvitedUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Bill>(entity =>
        {
            entity.ToTable("bills");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.GroupId).HasColumnName("group_id");
            entity.Property(x => x.StoreName).HasColumnName("store_name").HasMaxLength(200).IsRequired();
            entity.Property(x => x.ReferenceImageDataUrl).HasColumnName("reference_image_data_url").HasColumnType("longtext");
            entity.Property(x => x.TransactionDateUtc).HasColumnName("transaction_date_utc").IsRequired();
            entity.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsRequired();
            entity.Property(x => x.SplitMode).HasColumnName("split_mode").IsRequired();
            entity.Property(x => x.PrimaryPayerParticipantId).HasColumnName("primary_payer_participant_id").IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
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
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.BillId).HasColumnName("bill_id");
            entity.Property(x => x.Description).HasColumnName("description").HasMaxLength(200).IsRequired();
            entity.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
            entity.HasIndex(x => x.BillId);

            entity.HasOne(x => x.Bill)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.BillId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BillItemResponsibility>(entity =>
        {
            entity.ToTable("bill_item_responsibilities");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.BillItemId).HasColumnName("bill_item_id");
            entity.Property(x => x.ParticipantId).HasColumnName("participant_id");
            entity.HasIndex(x => new { x.BillItemId, x.ParticipantId }).IsUnique();

            entity.HasOne(x => x.BillItem)
                .WithMany(x => x.Responsibilities)
                .HasForeignKey(x => x.BillItemId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Participant)
                .WithMany(x => x.BillItemResponsibilities)
                .HasForeignKey(x => x.ParticipantId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BillFee>(entity =>
        {
            entity.ToTable("bill_fees");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.BillId).HasColumnName("bill_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            entity.Property(x => x.FeeType).HasColumnName("fee_type").IsRequired();
            entity.Property(x => x.Value).HasColumnName("value").HasPrecision(18, 2).IsRequired();

            entity.HasOne(x => x.Bill)
                .WithMany(x => x.Fees)
                .HasForeignKey(x => x.BillId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BillShare>(entity =>
        {
            entity.ToTable("bill_shares");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.BillId).HasColumnName("bill_id");
            entity.Property(x => x.ParticipantId).HasColumnName("participant_id");
            entity.Property(x => x.Weight).HasColumnName("weight").HasPrecision(18, 4).IsRequired();
            entity.Property(x => x.PreFeeAmount).HasColumnName("pre_fee_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.FeeAmount).HasColumnName("fee_amount").HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.TotalShareAmount).HasColumnName("total_share_amount").HasPrecision(18, 2).IsRequired();
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
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.BillId).HasColumnName("bill_id");
            entity.Property(x => x.ParticipantId).HasColumnName("participant_id");
            entity.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
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

        modelBuilder.Entity<SettlementTransferConfirmation>(entity =>
        {
            entity.ToTable("settlement_transfer_confirmations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.GroupId).HasColumnName("group_id");
            entity.Property(x => x.TransferKey).HasColumnName("transfer_key").HasMaxLength(250).IsRequired();
            entity.Property(x => x.FromParticipantId).HasColumnName("from_participant_id");
            entity.Property(x => x.ToParticipantId).HasColumnName("to_participant_id");
            entity.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2).IsRequired();
            entity.Property(x => x.FromDateUtc).HasColumnName("from_date_utc");
            entity.Property(x => x.ToDateUtc).HasColumnName("to_date_utc");
            entity.Property(x => x.Status)
                .HasColumnName("status")
                .HasConversion<int>()
                .HasDefaultValue(SettlementTransferStatus.Pending)
                .IsRequired();
            entity.Property(x => x.ProofScreenshotDataUrl)
                .HasColumnName("proof_screenshot_data_url")
                .HasColumnType("longtext");
            entity.Property(x => x.MarkedPaidAtUtc).HasColumnName("marked_paid_at_utc");
            entity.Property(x => x.MarkedReceivedAtUtc).HasColumnName("marked_received_at_utc");
            entity.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc").IsRequired();
            entity.HasIndex(x => new { x.GroupId, x.TransferKey }).IsUnique();
            entity.HasIndex(x => new { x.GroupId, x.FromParticipantId, x.ToParticipantId });
        });

        modelBuilder.Entity<SettlementShareLink>(entity =>
        {
            entity.ToTable("settlement_share_links");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.GroupId).HasColumnName("group_id");
            entity.Property(x => x.ShareToken).HasColumnName("share_token").HasMaxLength(80).IsRequired();
            entity.Property(x => x.FromDateUtc).HasColumnName("from_date_utc");
            entity.Property(x => x.ToDateUtc).HasColumnName("to_date_utc");
            entity.Property(x => x.CreatorName).HasColumnName("creator_name").HasMaxLength(150);
            entity.Property(x => x.PayeeName).HasColumnName("payee_name").HasMaxLength(150);
            entity.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasMaxLength(120);
            entity.Property(x => x.AccountName).HasColumnName("account_name").HasMaxLength(150);
            entity.Property(x => x.AccountNumber).HasColumnName("account_number").HasMaxLength(120);
            entity.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(2000);
            entity.Property(x => x.PaymentQrDataUrl).HasColumnName("payment_qr_data_url").HasColumnType("longtext");
            entity.Property(x => x.ReceiverPaymentInfosJson).HasColumnName("receiver_payment_infos_json").HasColumnType("longtext");
            entity.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true).IsRequired();
            entity.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
            entity.HasIndex(x => x.ShareToken).IsUnique();
            entity.HasIndex(x => x.GroupId);

            entity.HasOne(x => x.Group)
                .WithMany()
                .HasForeignKey(x => x.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
