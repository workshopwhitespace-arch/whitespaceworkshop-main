/*
  Warnings:

  - You are about to drop the `LedgerEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `LedgerEntry` DROP FOREIGN KEY `LedgerEntry_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `LedgerEntry` DROP FOREIGN KEY `LedgerEntry_projectId_fkey`;

-- DropForeignKey
ALTER TABLE `LedgerEntry` DROP FOREIGN KEY `LedgerEntry_recordedById_fkey`;

-- DropTable
DROP TABLE `LedgerEntry`;
