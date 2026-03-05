-- CreateEnum (solo si no existe: evita error en DB que ya tiene el tipo)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GuestType') THEN
    CREATE TYPE "GuestType" AS ENUM ('PERSON', 'COMPANY');
  END IF;
END
$$;

-- AlterTable (columnas e índice solo si no existen)
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "type" "GuestType" NOT NULL DEFAULT 'PERSON';
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "companyRut" TEXT;
ALTER TABLE "Guest" ADD COLUMN IF NOT EXISTS "companyEmail" TEXT;

CREATE INDEX IF NOT EXISTS "Guest_type_idx" ON "Guest"("type");
