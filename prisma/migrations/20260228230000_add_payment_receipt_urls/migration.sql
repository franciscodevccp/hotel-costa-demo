-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill: copy single receiptUrl into receiptUrls where present
UPDATE "Payment"
SET "receiptUrls" = ARRAY["receiptUrl"]
WHERE "receiptUrl" IS NOT NULL AND "receiptUrl" != '';
