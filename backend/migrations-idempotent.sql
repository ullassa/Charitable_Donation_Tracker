IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [OtpVerifications] (
        [OtpId] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [PhoneNumber] nvarchar(max) NOT NULL,
        [OtpCode] nvarchar(max) NOT NULL,
        [ExpiryTime] datetime2 NOT NULL,
        CONSTRAINT [PK_OtpVerifications] PRIMARY KEY ([OtpId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [Payments] (
        [PaymentId] int NOT NULL IDENTITY,
        [PaymentMethod] int NOT NULL,
        [TransactionReference] nvarchar(200) NULL,
        [PaymentDate] datetime2 NOT NULL,
        CONSTRAINT [PK_Payments] PRIMARY KEY ([PaymentId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [Users] (
        [UserId] int NOT NULL IDENTITY,
        [UserName] nvarchar(100) NOT NULL,
        [Email] nvarchar(150) NOT NULL,
        [PhoneNumber] nvarchar(450) NOT NULL,
        [PasswordHash] nvarchar(500) NOT NULL,
        [UserRole] int NOT NULL,
        [IsEmailVerified] bit NOT NULL,
        [IsPhoneVerified] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Users] PRIMARY KEY ([UserId])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [Charities] (
        [CharityRegistrationId] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [RegistrationId] nvarchar(100) NOT NULL,
        [Mission] nvarchar(max) NOT NULL,
        [About] nvarchar(max) NOT NULL,
        [Activities] nvarchar(max) NOT NULL,
        [CauseType] int NOT NULL,
        [AddressLine] nvarchar(300) NOT NULL,
        [City] nvarchar(100) NOT NULL,
        [IndianState] int NOT NULL,
        [Pincode] nvarchar(max) NOT NULL,
        [ManagerName] nvarchar(150) NOT NULL,
        [ManagerPhone] nvarchar(max) NOT NULL,
        [SocialMediaLink] nvarchar(300) NOT NULL,
        [Status] int NOT NULL,
        [AdminComment] nvarchar(1000) NULL,
        [SubmittedAt] datetime2 NOT NULL,
        [ReviewedAt] datetime2 NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_Charities] PRIMARY KEY ([CharityRegistrationId]),
        CONSTRAINT [FK_Charities_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [Customers] (
        [CustomerId] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [DateOfBirth] datetime2 NOT NULL,
        [Gender] nvarchar(10) NOT NULL,
        [City] nvarchar(100) NOT NULL,
        [IsAnonymousDefault] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Customers] PRIMARY KEY ([CustomerId]),
        CONSTRAINT [FK_Customers_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [OTPs] (
        [OtpId] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [OtpCode] nvarchar(10) NOT NULL,
        [OtpType] int NOT NULL,
        [ExpiryTime] datetime2 NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [IsUsed] bit NOT NULL,
        CONSTRAINT [PK_OTPs] PRIMARY KEY ([OtpId]),
        CONSTRAINT [FK_OTPs_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [CharityImage] (
        [ImageId] int NOT NULL IDENTITY,
        [CharityRegistrationId] int NOT NULL,
        [ImageUrl] nvarchar(500) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_CharityImage] PRIMARY KEY ([ImageId]),
        CONSTRAINT [FK_CharityImage_Charities_CharityRegistrationId] FOREIGN KEY ([CharityRegistrationId]) REFERENCES [Charities] ([CharityRegistrationId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [Donations] (
        [DonationId] int NOT NULL IDENTITY,
        [CustomerId] int NOT NULL,
        [CharityRegistrationId] int NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [DonationDate] datetime2 NOT NULL,
        [IsAnonymous] bit NOT NULL,
        [PaymentId] int NOT NULL,
        CONSTRAINT [PK_Donations] PRIMARY KEY ([DonationId]),
        CONSTRAINT [FK_Donations_Charities_CharityRegistrationId] FOREIGN KEY ([CharityRegistrationId]) REFERENCES [Charities] ([CharityRegistrationId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Donations_Customers_CustomerId] FOREIGN KEY ([CustomerId]) REFERENCES [Customers] ([CustomerId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Donations_Payments_PaymentId] FOREIGN KEY ([PaymentId]) REFERENCES [Payments] ([PaymentId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE TABLE [Notifications] (
        [NotificationId] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [DonationId] int NULL,
        [Message] nvarchar(1000) NOT NULL,
        [NotificationType] int NOT NULL,
        [SentAt] datetime2 NOT NULL,
        CONSTRAINT [PK_Notifications] PRIMARY KEY ([NotificationId]),
        CONSTRAINT [FK_Notifications_Donations_DonationId] FOREIGN KEY ([DonationId]) REFERENCES [Donations] ([DonationId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_Notifications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId]) ON DELETE NO ACTION
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE INDEX [IX_Charities_UserId] ON [Charities] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE INDEX [IX_CharityImage_CharityRegistrationId] ON [CharityImage] ([CharityRegistrationId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Customers_UserId] ON [Customers] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE INDEX [IX_Donations_CharityRegistrationId] ON [Donations] ([CharityRegistrationId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE INDEX [IX_Donations_CustomerId] ON [Donations] ([CustomerId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Donations_PaymentId] ON [Donations] ([PaymentId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE INDEX [IX_Notifications_DonationId] ON [Notifications] ([DonationId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE INDEX [IX_Notifications_UserId] ON [Notifications] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE INDEX [IX_OTPs_UserId] ON [OTPs] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_Users_PhoneNumber] ON [Users] ([PhoneNumber]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260417072804_IntialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260417072804_IntialCreate', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260422161500_AddCharityTargetAmount'
)
BEGIN
    IF OBJECT_ID('dbo.Charities', 'U') IS NOT NULL
      AND COL_LENGTH('dbo.Charities', 'TargetAmount') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Charities]
        ADD [TargetAmount] decimal(18,2) NOT NULL DEFAULT(100000);
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260422161500_AddCharityTargetAmount'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260422161500_AddCharityTargetAmount', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260427_AddTargetAmountColumn'
)
BEGIN
    IF OBJECT_ID('dbo.Charities', 'U') IS NOT NULL
      AND COL_LENGTH('dbo.Charities', 'TargetAmount') IS NULL
    BEGIN
        ALTER TABLE [dbo].[Charities]
        ADD [TargetAmount] decimal(18,2) NOT NULL DEFAULT(100000);
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260427_AddTargetAmountColumn'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260427_AddTargetAmountColumn', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260427_CreateFavoriteCharitiesTable'
)
BEGIN
    IF OBJECT_ID('dbo.FavoriteCharities', 'U') IS NULL
    BEGIN
        CREATE TABLE [dbo].[FavoriteCharities] (
            [FavoriteCharityId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            [CustomerId] INT NOT NULL,
            [CharityRegistrationId] INT NOT NULL,
            [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
        );
        CREATE UNIQUE INDEX [IX_FavoriteCharities_CustomerId_CharityRegistrationId]
            ON [dbo].[FavoriteCharities]([CustomerId], [CharityRegistrationId]);
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260427_CreateFavoriteCharitiesTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260427_CreateFavoriteCharitiesTable', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260427_CreateFeedbacksTable'
)
BEGIN
    IF OBJECT_ID('dbo.Feedbacks', 'U') IS NULL
    BEGIN
        CREATE TABLE [dbo].[Feedbacks] (
            [FeedbackId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
            [UserId] INT NULL,
            [DonationId] INT NULL,
            [CharityName] NVARCHAR(200) NOT NULL DEFAULT(''),
            [Amount] DECIMAL(18,2) NULL,
            [PaymentMethod] NVARCHAR(50) NOT NULL DEFAULT(''),
            [PaymentReference] NVARCHAR(120) NOT NULL DEFAULT(''),
            [Rating] INT NOT NULL,
            [Experience] NVARCHAR(2000) NOT NULL,
            [Suggestion] NVARCHAR(2000) NOT NULL DEFAULT(''),
            [CreatedAt] DATETIME2 NOT NULL DEFAULT(SYSUTCDATETIME())
        );
    END
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260427_CreateFeedbacksTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260427_CreateFeedbacksTable', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429_AddAddressLineToUsers'
)
BEGIN
    ALTER TABLE [Users] ADD [AddressLine] nvarchar(500) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429_AddAddressLineToUsers'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260429_AddAddressLineToUsers', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429_AddCharityBankFields'
)
BEGIN
    ALTER TABLE [Charities] ADD [AccountHolderName] nvarchar(150) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429_AddCharityBankFields'
)
BEGIN
    ALTER TABLE [Charities] ADD [AccountNumber] nvarchar(30) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429_AddCharityBankFields'
)
BEGIN
    ALTER TABLE [Charities] ADD [BankName] nvarchar(150) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429_AddCharityBankFields'
)
BEGIN
    ALTER TABLE [Charities] ADD [IFSCCode] nvarchar(11) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429_AddCharityBankFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260429_AddCharityBankFields', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429075459_AddAuditLogsTable'
)
BEGIN
    CREATE TABLE [AuditLogs] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NULL,
        [UserRole] nvarchar(32) NOT NULL,
        [Action] nvarchar(32) NOT NULL,
        [EntityName] nvarchar(64) NOT NULL,
        [EntityId] int NULL,
        [Details] nvarchar(1000) NOT NULL,
        [Timestamp] datetime2 NOT NULL DEFAULT (GETDATE()),
        CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429075459_AddAuditLogsTable'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_Timestamp] ON [AuditLogs] ([Timestamp]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429075459_AddAuditLogsTable'
)
BEGIN
    CREATE INDEX [IX_AuditLogs_UserId] ON [AuditLogs] ([UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260429075459_AddAuditLogsTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260429075459_AddAuditLogsTable', N'8.0.0');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260504085715_UpdatePaymentTableWithMoreFields'
)
BEGIN
    ALTER TABLE [Payments] ADD [Amount] decimal(18,2) NOT NULL DEFAULT 0.0;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260504085715_UpdatePaymentTableWithMoreFields'
)
BEGIN
    ALTER TABLE [Payments] ADD [Currency] nvarchar(10) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260504085715_UpdatePaymentTableWithMoreFields'
)
BEGIN
    ALTER TABLE [Payments] ADD [GatewayName] nvarchar(100) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260504085715_UpdatePaymentTableWithMoreFields'
)
BEGIN
    ALTER TABLE [Payments] ADD [Notes] nvarchar(500) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260504085715_UpdatePaymentTableWithMoreFields'
)
BEGIN
    ALTER TABLE [Payments] ADD [Status] nvarchar(50) NOT NULL DEFAULT N'';
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260504085715_UpdatePaymentTableWithMoreFields'
)
BEGIN
    ALTER TABLE [Payments] ADD [TransactionId] nvarchar(200) NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260504085715_UpdatePaymentTableWithMoreFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260504085715_UpdatePaymentTableWithMoreFields', N'8.0.0');
END;
GO

COMMIT;
GO

