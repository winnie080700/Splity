using Microsoft.EntityFrameworkCore;
using System.Data;

namespace Splity.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(SplityDbContext dbContext, CancellationToken cancellationToken = default)
    {
        await dbContext.Database.EnsureCreatedAsync(cancellationToken);
        await EnsureGroupSchemaAsync(dbContext, cancellationToken);
        await EnsureAppUserSchemaAsync(dbContext, cancellationToken);
        await EnsureSettlementTransferConfirmationSchemaAsync(dbContext, cancellationToken);
        await EnsureSettlementShareLinkSchemaAsync(dbContext, cancellationToken);

        return;
    }

    private static async Task EnsureGroupSchemaAsync(
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
            if (!await ColumnExistsAsync(connection, connection.Database, "groups", "status", cancellationToken))
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "ALTER TABLE groups ADD COLUMN status INT NOT NULL DEFAULT 0";
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
                    receiver_payment_infos_json LONGTEXT NULL,
                    is_active BIT NOT NULL DEFAULT b'1',
                    created_at_utc DATETIME(6) NOT NULL,
                    CONSTRAINT pk_settlement_share_links PRIMARY KEY (id),
                    CONSTRAINT ux_settlement_share_links_share_token UNIQUE (share_token),
                    INDEX ix_settlement_share_links_group_id (group_id),
                    CONSTRAINT fk_settlement_share_links_groups_group_id FOREIGN KEY (group_id) REFERENCES groups (id) ON DELETE CASCADE
                )
                """;
            await command.ExecuteNonQueryAsync(cancellationToken);

            if (!await ColumnExistsAsync(connection, connection.Database, "settlement_share_links", "receiver_payment_infos_json", cancellationToken))
            {
                await using var addReceiverInfosCommand = connection.CreateCommand();
                addReceiverInfosCommand.CommandText = "ALTER TABLE settlement_share_links ADD COLUMN receiver_payment_infos_json LONGTEXT NULL";
                await addReceiverInfosCommand.ExecuteNonQueryAsync(cancellationToken);
            }

            if (!await ColumnExistsAsync(connection, connection.Database, "settlement_share_links", "is_active", cancellationToken))
            {
                await using var addIsActiveCommand = connection.CreateCommand();
                addIsActiveCommand.CommandText = "ALTER TABLE settlement_share_links ADD COLUMN is_active BIT NOT NULL DEFAULT b'1'";
                await addIsActiveCommand.ExecuteNonQueryAsync(cancellationToken);
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

    private static async Task EnsureAppUserSchemaAsync(
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
            if (!await ColumnExistsAsync(connection, connection.Database, "app_users", "email_verified_at_utc", cancellationToken))
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "ALTER TABLE app_users ADD COLUMN email_verified_at_utc DATETIME(6) NULL";
                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            if (!await ColumnExistsAsync(connection, connection.Database, "app_users", "pending_email_verification_code_hash", cancellationToken))
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "ALTER TABLE app_users ADD COLUMN pending_email_verification_code_hash VARCHAR(128) NULL";
                await command.ExecuteNonQueryAsync(cancellationToken);
            }

            if (!await ColumnExistsAsync(connection, connection.Database, "app_users", "pending_email_verification_expires_at_utc", cancellationToken))
            {
                await using var command = connection.CreateCommand();
                command.CommandText = "ALTER TABLE app_users ADD COLUMN pending_email_verification_expires_at_utc DATETIME(6) NULL";
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
