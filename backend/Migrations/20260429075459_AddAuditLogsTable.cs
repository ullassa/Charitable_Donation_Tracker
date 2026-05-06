using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareFund.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID('dbo.AuditLogs','U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AuditLogs](
        [Id] int IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] int NULL,
        [UserRole] nvarchar(32) NOT NULL,
        [Action] nvarchar(32) NOT NULL,
        [EntityName] nvarchar(64) NOT NULL,
        [EntityId] int NULL,
        [Details] nvarchar(1000) NOT NULL,
        [Timestamp] datetime2 NOT NULL DEFAULT(GETDATE())
    );
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'IX_AuditLogs_Timestamp' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE INDEX [IX_AuditLogs_Timestamp] ON [dbo].[AuditLogs]([Timestamp]);
END
");

            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT name FROM sys.indexes WHERE name = 'IX_AuditLogs_UserId' AND object_id = OBJECT_ID('dbo.AuditLogs'))
BEGIN
    CREATE INDEX [IX_AuditLogs_UserId] ON [dbo].[AuditLogs]([UserId]);
END
");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AuditLogs");
        }
    }
}
