-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptEntries" JSONB;
