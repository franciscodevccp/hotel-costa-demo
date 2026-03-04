-- CreateEnum (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PayablePaymentType') THEN
    CREATE TYPE "PayablePaymentType" AS ENUM ('SINGLE', 'RECURRING');
  END IF;
END
$$;

-- AlterTable: añadir columnas para tipo de pago y recurrencia
ALTER TABLE "Payable" ADD COLUMN IF NOT EXISTS "paymentType" "PayablePaymentType" NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "Payable" ADD COLUMN IF NOT EXISTS "firstDueDate" TIMESTAMP(3);
ALTER TABLE "Payable" ADD COLUMN IF NOT EXISTS "intervalDays" INTEGER;
