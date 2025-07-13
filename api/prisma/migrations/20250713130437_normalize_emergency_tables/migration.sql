/*
  Warnings:

  - You are about to drop the column `recordIds` on the `EmergencySnapshot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EmergencySnapshot" DROP COLUMN "recordIds";

-- CreateTable
CREATE TABLE "EmergencySnapshotRecord" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,

    CONSTRAINT "EmergencySnapshotRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencySnapshotRecord_snapshotId_recordId_key" ON "EmergencySnapshotRecord"("snapshotId", "recordId");

-- AddForeignKey
ALTER TABLE "EmergencySnapshotRecord" ADD CONSTRAINT "EmergencySnapshotRecord_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "EmergencySnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencySnapshotRecord" ADD CONSTRAINT "EmergencySnapshotRecord_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "Record"("id") ON DELETE CASCADE ON UPDATE CASCADE;
