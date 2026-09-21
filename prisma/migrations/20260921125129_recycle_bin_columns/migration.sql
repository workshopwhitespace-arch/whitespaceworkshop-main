-- AlterTable
ALTER TABLE `Task` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Todo` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `deletedById` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Task_deletedAt_idx` ON `Task`(`deletedAt`);

-- CreateIndex
CREATE INDEX `Todo_deletedAt_idx` ON `Todo`(`deletedAt`);

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Todo` ADD CONSTRAINT `Todo_deletedById_fkey` FOREIGN KEY (`deletedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

