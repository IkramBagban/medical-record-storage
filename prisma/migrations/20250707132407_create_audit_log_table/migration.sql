/*
  Warnings:

  - A unique constraint covering the columns `[fileUrl]` on the table `Record` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuditLogStatus" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateEnum
CREATE TYPE "AuditLogAction" AS ENUM ('LOGIN_OTP_SENT', 'LOGIN_VERIFIED', 'SIGNUP_OTP_SENT', 'SIGNUP_VERIFIED', 'RECORD_UPLOAD_GET_URL', 'RECORD_UPLOAD', 'RECORDS_VIEWED', 'RECORD_VIEWED', 'RECORD_DELETE', 'CAREGIVER_REQUESTED', 'CAREGIVER_APPROVED', 'CAREGIVER_ACCESS');

-- CreateEnum
CREATE TYPE "AuditLogTargetType" AS ENUM ('USER', 'RECORD', 'CAREGIVER_REQUEST');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "targetId" TEXT,
    "targetType" "AuditLogTargetType",
    "ipAddress" TEXT,
    "status" "AuditLogStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Record_fileUrl_key" ON "Record"("fileUrl");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
