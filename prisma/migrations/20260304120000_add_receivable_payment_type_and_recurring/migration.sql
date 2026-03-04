-- CreateEnum (solo si no existe, por si ya se aplicó con db push)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReceivablePaymentType') THEN
    CREATE TYPE "ReceivablePaymentType" AS ENUM ('SINGLE', 'RECURRING');
  END IF;
END
$$;

-- AlterTable: añadir columnas para tipo de pago y recurrencia
ALTER TABLE "Receivable" ADD COLUMN IF NOT EXISTS "paymentType" "ReceivablePaymentType" NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "Receivable" ADD COLUMN IF NOT EXISTS "firstDueDate" TIMESTAMP(3);
ALTER TABLE "Receivable" ADD COLUMN IF NOT EXISTS "intervalDays" INTEGER;
