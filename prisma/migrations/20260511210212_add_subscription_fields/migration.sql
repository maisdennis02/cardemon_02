/*
  Warnings:

  - A unique constraint covering the columns `[billingCustomerId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[billingSubscriptionId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "billingCustomerId" TEXT,
ADD COLUMN     "billingCycle" "BillingCycle",
ADD COLUMN     "billingSubscriptionId" TEXT,
ADD COLUMN     "proExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_billingCustomerId_key" ON "User"("billingCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "User_billingSubscriptionId_key" ON "User"("billingSubscriptionId");
