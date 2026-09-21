-- DropForeignKey
ALTER TABLE `Quotation` DROP FOREIGN KEY `Quotation_clientId_fkey`;

-- DropIndex
DROP INDEX `Quotation_clientId_fkey` ON `Quotation`;

-- AlterTable
ALTER TABLE `Quotation` ADD COLUMN `clientName` VARCHAR(191) NOT NULL,
    MODIFY `clientId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Quotation` ADD CONSTRAINT `Quotation_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Client`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- Existing quotations: carry over the name they printed with (company, else person).
UPDATE `Quotation` q JOIN `Client` c ON c.`id` = q.`clientId`
SET q.`clientName` = COALESCE(NULLIF(c.`companyName`, ''), c.`name`);
