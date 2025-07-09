-- CreateEnum
CREATE TYPE "CaregiverRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CaregiverRequest" (
    "id" TEXT NOT NULL,
    "caregiverId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" "CaregiverRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverRequest_caregiverId_patientId_key" ON "CaregiverRequest"("caregiverId", "patientId");

-- AddForeignKey
ALTER TABLE "CaregiverRequest" ADD CONSTRAINT "CaregiverRequest_caregiverId_fkey" FOREIGN KEY ("caregiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaregiverRequest" ADD CONSTRAINT "CaregiverRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
