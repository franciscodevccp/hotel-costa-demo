-- CreateTable
CREATE TABLE "Receivable" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "debtorName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceivablePayment" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ReceivablePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Receivable_establishmentId_idx" ON "Receivable"("establishmentId");

-- CreateIndex
CREATE INDEX "Receivable_establishmentId_dueDate_idx" ON "Receivable"("establishmentId", "dueDate");

-- CreateIndex
CREATE INDEX "ReceivablePayment_receivableId_idx" ON "ReceivablePayment"("receivableId");

-- AddForeignKey
ALTER TABLE "Receivable" ADD CONSTRAINT "Receivable_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceivablePayment" ADD CONSTRAINT "ReceivablePayment_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "Receivable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
