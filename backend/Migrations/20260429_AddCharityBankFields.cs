using CareFund.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareFund.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260429_AddCharityBankFields")]
    public partial class AddCharityBankFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Charities','AccountHolderName') IS NULL BEGIN ALTER TABLE [Charities] ADD [AccountHolderName] nvarchar(150) NOT NULL DEFAULT('') END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Charities','AccountNumber') IS NULL BEGIN ALTER TABLE [Charities] ADD [AccountNumber] nvarchar(30) NOT NULL DEFAULT('') END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Charities','BankName') IS NULL BEGIN ALTER TABLE [Charities] ADD [BankName] nvarchar(150) NOT NULL DEFAULT('') END"
            );

            migrationBuilder.Sql(
                "IF COL_LENGTH('dbo.Charities','IFSCCode') IS NULL BEGIN ALTER TABLE [Charities] ADD [IFSCCode] nvarchar(11) NOT NULL DEFAULT('') END"
            );
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountHolderName",
                table: "Charities");

            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "Charities");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "Charities");

            migrationBuilder.DropColumn(
                name: "IFSCCode",
                table: "Charities");
        }
    }
}
