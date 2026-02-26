-- AlterEnum
ALTER TYPE "RoomType" ADD VALUE 'QUINTUPLE';

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "syncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "externalId" TEXT;

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" SERIAL NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "reservationsFound" INTEGER NOT NULL DEFAULT 0,
    "reservationsCreated" INTEGER NOT NULL DEFAULT 0,
    "reservationsSkipped" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncLog_source_createdAt_idx" ON "SyncLog"("source", "createdAt");

-- CreateIndex
CREATE INDEX "Room_externalId_idx" ON "Room"("externalId");
