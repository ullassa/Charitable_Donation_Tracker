using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareFund.Migrations
{
    /// <inheritdoc />
    public partial class UpdatePaymentTableWithMoreFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Payments','Amount') IS NULL BEGIN ALTER TABLE [Payments] ADD [Amount] decimal(18,2) NOT NULL DEFAULT(0) END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Payments','Currency') IS NULL BEGIN ALTER TABLE [Payments] ADD [Currency] nvarchar(10) NOT NULL DEFAULT('') END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Payments','GatewayName') IS NULL BEGIN ALTER TABLE [Payments] ADD [GatewayName] nvarchar(100) NULL END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Payments','Notes') IS NULL BEGIN ALTER TABLE [Payments] ADD [Notes] nvarchar(500) NULL END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Payments','Status') IS NULL BEGIN ALTER TABLE [Payments] ADD [Status] nvarchar(50) NOT NULL DEFAULT('') END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Payments','TransactionId') IS NULL BEGIN ALTER TABLE [Payments] ADD [TransactionId] nvarchar(200) NULL END"
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Amount",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "GatewayName",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "TransactionId",
                table: "Payments");
        }
    }
}
