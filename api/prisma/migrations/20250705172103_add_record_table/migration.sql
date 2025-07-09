-- CreateEnum
CREATE TYPE "Ownership" AS ENUM ('SELF', 'DEPENDENT');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('PRESCRIPTION', 'LAB_REPORT', 'SCAN', 'CONSULTATION', 'VACCINATION', 'MEDICAL_CERTIFICATE', 'OTHER');

-- CreateTable
CREATE TABLE "Record" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "RecordType" NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "tags" TEXT[],
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "uploaderId" TEXT NOT NULL,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Record_ownerId_idx" ON "Record"("ownerId");

-- CreateIndex
CREATE INDEX "Record_uploaderId_idx" ON "Record"("uploaderId");

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Record" ADD CONSTRAINT "Record_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
