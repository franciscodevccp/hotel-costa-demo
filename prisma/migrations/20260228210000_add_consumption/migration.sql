-- CreateTable
CREATE TABLE "Consumption" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "consumptionNumber" TEXT NOT NULL,
    "description" TEXT,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "cardImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consumption_reservationId_idx" ON "Consumption"("reservationId");

-- AddForeignKey
ALTER TABLE "Consumption" ADD CONSTRAINT "Consumption_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
