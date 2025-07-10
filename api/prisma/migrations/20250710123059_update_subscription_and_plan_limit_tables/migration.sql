/*
  Warnings:

  - You are about to drop the column `Status` on the `PlanLimit` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `Subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,status]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `status` to the `PlanLimit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `PlanLimit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlanLimit" DROP COLUMN "Status",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "PlanLimitStatus" NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "createAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "PlanLimit_subscriptionId_idx" ON "PlanLimit"("subscriptionId");

-- CreateIndex
CREATE INDEX "PlanLimit_userId_idx" ON "PlanLimit"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_status_key" ON "Subscription"("userId", "status");
