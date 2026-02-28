-- CreateEnum
CREATE TYPE "GuestType" AS ENUM ('PERSON', 'COMPANY');

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN "type" "GuestType" NOT NULL DEFAULT 'PERSON';
ALTER TABLE "Guest" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Guest" ADD COLUMN "companyRut" TEXT;
ALTER TABLE "Guest" ADD COLUMN "companyEmail" TEXT;

-- CreateIndex
CREATE INDEX "Guest_type_idx" ON "Guest"("type");
