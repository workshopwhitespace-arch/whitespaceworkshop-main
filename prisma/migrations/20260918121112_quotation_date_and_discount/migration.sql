-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `discount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `quotationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Existing quotations: date them by when they were created, not by this migration.
UPDATE `Quotation` SET `quotationDate` = `createdAt`;
