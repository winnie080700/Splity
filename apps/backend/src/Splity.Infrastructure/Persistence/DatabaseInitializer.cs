using Microsoft.EntityFrameworkCore;
using Splity.Domain.Entities;
using Splity.Domain.Enums;

namespace Splity.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(SplityDbContext dbContext, CancellationToken cancellationToken = default)
    {
        if (dbContext.Database.IsRelational())
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
        else
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        }

        if (await dbContext.Groups.AnyAsync(cancellationToken))
        {
            return;
        }

        var groupId = Guid.NewGuid();
        var aliceId = Guid.NewGuid();
        var bobId = Guid.NewGuid();
        var charlieId = Guid.NewGuid();
        var billId = Guid.NewGuid();
        var nowUtc = DateTime.UtcNow;

        dbContext.Groups.Add(new Group
        {
            Id = groupId,
            Name = "Demo Group",
            CreatedAtUtc = nowUtc
        });

        dbContext.Participants.AddRange(
            new Participant { Id = aliceId, GroupId = groupId, Name = "Alice", CreatedAtUtc = nowUtc },
            new Participant { Id = bobId, GroupId = groupId, Name = "Bob", CreatedAtUtc = nowUtc },
            new Participant { Id = charlieId, GroupId = groupId, Name = "Charlie", CreatedAtUtc = nowUtc });

        dbContext.Bills.Add(new Bill
        {
            Id = billId,
            GroupId = groupId,
            StoreName = "GrocerX",
            TransactionDateUtc = nowUtc.Date,
            CurrencyCode = "MYR",
            SplitMode = SplitMode.Equal,
            PrimaryPayerParticipantId = aliceId,
            CreatedAtUtc = nowUtc,
            UpdatedAtUtc = nowUtc
        });

        dbContext.BillItems.AddRange(
            new BillItem { Id = Guid.NewGuid(), BillId = billId, Description = "Groceries", Amount = 80.00m },
            new BillItem { Id = Guid.NewGuid(), BillId = billId, Description = "Snacks", Amount = 20.00m });

        dbContext.BillFees.Add(new BillFee
        {
            Id = Guid.NewGuid(),
            BillId = billId,
            Name = "SST",
            FeeType = FeeType.Percentage,
            Value = 6.00m
        });

        dbContext.BillShares.AddRange(
            new BillShare
            {
                Id = Guid.NewGuid(),
                BillId = billId,
                ParticipantId = aliceId,
                Weight = 1m,
                PreFeeAmount = 33.34m,
                FeeAmount = 2.00m,
                TotalShareAmount = 35.34m
            },
            new BillShare
            {
                Id = Guid.NewGuid(),
                BillId = billId,
                ParticipantId = bobId,
                Weight = 1m,
                PreFeeAmount = 33.33m,
                FeeAmount = 2.00m,
                TotalShareAmount = 35.33m
            },
            new BillShare
            {
                Id = Guid.NewGuid(),
                BillId = billId,
                ParticipantId = charlieId,
                Weight = 1m,
                PreFeeAmount = 33.33m,
                FeeAmount = 2.00m,
                TotalShareAmount = 35.33m
            });

        dbContext.PaymentContributions.Add(new PaymentContribution
        {
            Id = Guid.NewGuid(),
            BillId = billId,
            ParticipantId = aliceId,
            Amount = 106m,
            CreatedAtUtc = nowUtc
        });

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
