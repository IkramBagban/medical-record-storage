-- CreateTable
CREATE TABLE "EmergencySnapshot" (
    "id" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "recordIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "EmergencySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmergencySnapshot_qrToken_key" ON "EmergencySnapshot"("qrToken");

-- CreateIndex
CREATE INDEX "EmergencySnapshot_qrToken_idx" ON "EmergencySnapshot"("qrToken");

-- AddForeignKey
ALTER TABLE "EmergencySnapshot" ADD CONSTRAINT "EmergencySnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
