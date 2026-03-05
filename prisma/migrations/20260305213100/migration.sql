-- DropIndex
DROP INDEX "Reservation_processedById_idx";

-- CreateTable
CREATE TABLE "MotopressIgnoredBooking" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "motopressId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotopressIgnoredBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MotopressIgnoredBooking_establishmentId_idx" ON "MotopressIgnoredBooking"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MotopressIgnoredBooking_establishmentId_motopressId_key" ON "MotopressIgnoredBooking"("establishmentId", "motopressId");

-- AddForeignKey
ALTER TABLE "MotopressIgnoredBooking" ADD CONSTRAINT "MotopressIgnoredBooking_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
