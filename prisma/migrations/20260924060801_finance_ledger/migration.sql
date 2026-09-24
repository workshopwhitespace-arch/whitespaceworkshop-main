-- CreateTable
CREATE TABLE `FinanceAccount` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('CASH', 'SAVING', 'CURRENT') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `openingBalance` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `openingDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FinanceAccount_type_key`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinanceCategory` (
    `id` VARCHAR(191) NOT NULL,
    `kind` ENUM('INCOME', 'EXPENSE') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `FinanceCategory_kind_name_key`(`kind`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinanceTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('MONEY_IN', 'MONEY_OUT', 'TRANSFER', 'OWNER_INVESTMENT', 'OWNER_WITHDRAWAL') NOT NULL,
    `status` ENUM('ACTIVE', 'VOID') NOT NULL DEFAULT 'ACTIVE',
    `date` DATETIME(3) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `toAccountId` VARCHAR(191) NULL,
    `categoryId` VARCHAR(191) NULL,
    `clientId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NULL,
    `counterparty` VARCHAR(191) NULL,
    `paymentMethod` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `attachmentUrl` VARCHAR(191) NULL,
    `reconciledAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `voidedById` VARCHAR(191) NULL,
    `voidedAt` DATETIME(3) NULL,
    `voidReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinanceTransaction_date_idx`(`date`),
    INDEX `FinanceTransaction_accountId_status_date_idx`(`accountId`, `status`, `date`),
    INDEX `FinanceTransaction_clientId_idx`(`clientId`),
    INDEX `FinanceTransaction_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinanceReconciliation` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `statementDate` DATETIME(3) NOT NULL,
    `actualBalance` DECIMAL(14, 2) NOT NULL,
    `erpBalance` DECIMAL(14, 2) NOT NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FinanceReconciliation_accountId_statementDate_idx`(`accountId`, `statementDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FinanceTransaction` ADD CONSTRAINT `FinanceTransaction_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `FinanceAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceTransaction` ADD CONSTRAINT `FinanceTransaction_toAccountId_fkey` FOREIGN KEY (`toAccountId`) REFERENCES `FinanceAccount`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceTransaction` ADD CONSTRAINT `FinanceTransaction_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `FinanceCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceTransaction` ADD CONSTRAINT `FinanceTransaction_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceTransaction` ADD CONSTRAINT `FinanceTransaction_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceTransaction` ADD CONSTRAINT `FinanceTransaction_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceTransaction` ADD CONSTRAINT `FinanceTransaction_voidedById_fkey` FOREIGN KEY (`voidedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceReconciliation` ADD CONSTRAINT `FinanceReconciliation_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `FinanceAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinanceReconciliation` ADD CONSTRAINT `FinanceReconciliation_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

