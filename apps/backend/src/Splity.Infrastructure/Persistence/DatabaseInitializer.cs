using Microsoft.EntityFrameworkCore;
using Splity.Domain.Entities;
using Splity.Domain.Enums;
using System.Data;

namespace Splity.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(SplityDbContext dbContext, CancellationToken cancellationToken = default)
    {
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        await EnsureSettlementTransferConfirmationSchemaAsync(dbContext, cancellationToken);
        await EnsureSettlementShareLinkSchemaAsync(dbContext, cancellationToken);

        if (await dbContext.Groups.AnyAsync(cancellationToken))
        {
            return;
        }

        var groupId = Guid.NewGuid();
        var aliceId = Guid.NewGuid();
        var bobId = Guid.NewGuid();
        var charlieId = Guid.NewGuid();
        var billId = Guid.NewGuid();
        var groceriesItemId = Guid.NewGuid();
        var snacksItemId = Guid.NewGuid();
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
            new BillItem { Id = groceriesItemId, BillId = billId, Description = "Groceries", Amount = 80.00m },
            new BillItem { Id = snacksItemId, BillId = billId, Description = "Snacks", Amount = 20.00m });

        dbContext.BillItemResponsibilities.AddRange(
            new BillItemResponsibility { Id = Guid.NewGuid(), BillItemId = groceriesItemId, ParticipantId = aliceId },
            new BillItemResponsibility { Id = Guid.NewGuid(), BillItemId = groceriesItemId, ParticipantId = bobId },
            new BillItemResponsibility { Id = Guid.NewGuid(), BillItemId = groceriesItemId, ParticipantId = charlieId },
            new BillItemResponsibility { Id = Guid.NewGuid(), BillItemId = snacksItemId, ParticipantId = charlieId });

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
                PreFeeAmount = 26.67m,
                FeeAmount = 1.60m,
                TotalShareAmount = 28.27m
            },
            new BillShare
            {
                Id = Guid.NewGuid(),
                BillId = billId,
                ParticipantId = bobId,
                Weight = 1m,
                PreFeeAmount = 26.67m,
                FeeAmount = 1.60m,
                TotalShareAmount = 28.27m
            },
            new BillShare
            {
                Id = Guid.NewGuid(),
                BillId = billId,
                ParticipantId = charlieId,
                Weight = 1m,
                PreFeeAmount = 46.66m,
                FeeAmount = 2.80m,
                TotalShareAmount = 49.46m
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

    private static async Task EnsureSettlementShareLinkSchemaAsync(
        SplityDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (dbContext.Database.IsInMemory())
        {
            return;
        }

        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE IF NOT EXISTS settlement_share_links (
                    id CHAR(36) NOT NULL,
                    group_id CHAR(36) NOT NULL,
                    share_token VARCHAR(80) NOT NULL,
                    from_date_utc DATETIME(6) NULL,
                    to_date_utc DATETIME(6) NULL,
                    creator_name VARCHAR(150) NULL,
                    payee_name VARCHAR(150) NULL,
                    payment_method VARCHAR(120) NULL,
                    account_name VARCHAR(150) NULL,
                    account_number VARCHAR(120) NULL,
                    notes VARCHAR(2000) NULL,
                    payment_qr_data_url LONGTEXT NULL,
                    created_at_utc DATETIME(6) NOT NULL,
                    CONSTRAINT pk_settlement_share_links PRIMARY KEY (id),
                    CONSTRAINT ux_settlement_share_links_share_token UNIQUE (share_token),
                    INDEX ix_settlement_share_links_group_id (group_id),
                    CONSTRAINT fk_settlement_share_links_groups_group_id FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
                )
                """;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task EnsureSettlementTransferConfirmationSchemaAsync(
        SplityDbContext dbContext,
        CancellationToken cancellationToken)
    {
        if (dbContext.Database.IsInMemory())
        {
            return;
        }

        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;
        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            if (!await ColumnExistsAsync(
                    connection,
                    connection.Database,
                    "settlement_transfer_confirmations",
                    "proof_screenshot_data_url",
                    cancellationToken))
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "ALTER TABLE settlement_transfer_confirmations ADD COLUMN proof_screenshot_data_url LONGTEXT NULL";
                await command.ExecuteNonQueryAsync(cancellationToken);
            }
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static async Task<bool> ColumnExistsAsync(
        System.Data.Common.DbConnection connection,
        string databaseName,
        string tableName,
        string columnName,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @schema
              AND TABLE_NAME = @table
              AND COLUMN_NAME = @column
            """;

        var schemaParameter = command.CreateParameter();
        schemaParameter.ParameterName = "@schema";
        schemaParameter.Value = databaseName;
        command.Parameters.Add(schemaParameter);

        var tableParameter = command.CreateParameter();
        tableParameter.ParameterName = "@table";
        tableParameter.Value = tableName;
        command.Parameters.Add(tableParameter);

        var columnParameter = command.CreateParameter();
        columnParameter.ParameterName = "@column";
        columnParameter.Value = columnName;
        command.Parameters.Add(columnParameter);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt32(result) > 0;
    }
}
