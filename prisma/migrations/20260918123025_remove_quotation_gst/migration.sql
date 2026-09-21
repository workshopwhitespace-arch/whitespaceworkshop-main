-- Totals were stored with GST added. Take it back out before the column goes,
-- so every total is simply the line amounts less the discount.
UPDATE `Quotation` SET `totalAmount` = `totalAmount` - `gstAmount`;

-- AlterTable
ALTER TABLE `Quotation` DROP COLUMN `gstAmount`;

