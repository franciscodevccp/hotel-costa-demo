-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "folioNumber" TEXT,
ADD COLUMN "processedById" TEXT,
ADD COLUMN "entryCardImageUrl" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_processedById_idx" ON "Reservation"("processedById");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
