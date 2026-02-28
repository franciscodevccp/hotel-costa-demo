-- CreateTable
CREATE TABLE "Payable" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "creditorName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "entryDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayablePayment" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "PayablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payable_establishmentId_idx" ON "Payable"("establishmentId");

-- CreateIndex
CREATE INDEX "Payable_establishmentId_dueDate_idx" ON "Payable"("establishmentId", "dueDate");

-- CreateIndex
CREATE INDEX "PayablePayment_payableId_idx" ON "PayablePayment"("payableId");

-- AddForeignKey
ALTER TABLE "Payable" ADD CONSTRAINT "Payable_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayablePayment" ADD CONSTRAINT "PayablePayment_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "Payable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
