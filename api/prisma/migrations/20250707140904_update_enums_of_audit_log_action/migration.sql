/*
  Warnings:

  - The values [CAREGIVER_REQUESTED,CAREGIVER_ACCESS] on the enum `AuditLogAction` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AuditLogAction_new" AS ENUM ('LOGIN_OTP_SENT', 'LOGIN_VERIFIED', 'SIGNUP_OTP_SENT', 'SIGNUP_VERIFIED', 'RECORD_UPLOAD_GET_URL', 'RECORD_UPLOAD', 'RECORDS_VIEWED', 'RECORD_VIEWED', 'RECORD_DELETE', 'CAREGIVER_ACCESS_REQUEST', 'CAREGIVER_APPROVED', 'CAREGIVER_REQUEST_VIEWED');
ALTER TYPE "AuditLogAction" RENAME TO "AuditLogAction_old";
ALTER TYPE "AuditLogAction_new" RENAME TO "AuditLogAction";
DROP TYPE "AuditLogAction_old";
COMMIT;
