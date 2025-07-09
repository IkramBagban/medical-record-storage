-- CreateTable
CREATE TABLE "OCRResult" (
    "id" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extractedData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "OCRResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OCRResult_fileKey_key" ON "OCRResult"("fileKey");

-- CreateIndex
CREATE INDEX "OCRResult_ownerId_idx" ON "OCRResult"("ownerId");

-- CreateIndex
CREATE INDEX "OCRResult_fileKey_idx" ON "OCRResult"("fileKey");

-- AddForeignKey
ALTER TABLE "OCRResult" ADD CONSTRAINT "OCRResult_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
