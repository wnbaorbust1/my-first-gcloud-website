-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('COMPLIMENTARY', 'ACTIVE_MONTHLY', 'ACTIVE_ANNUAL', 'PAYMENT_ISSUE', 'CANCELLED', 'EXPIRED', 'SPONSORED', 'ADMIN_GRANTED');

-- CreateEnum
CREATE TYPE "MembershipPlan" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'FAILED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";

-- DropTable
DROP TABLE "Subscription";

-- DropEnum
DROP TYPE "SubscriptionPlan";

-- DropEnum
DROP TYPE "SubscriptionStatus";

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'COMPLIMENTARY',
    "plan" "MembershipPlan",
    "qualifyingSessionRegistrationId" TEXT,
    "attendanceConfirmedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "trialStartsAt" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "paymentMethodBrand" TEXT,
    "paymentMethodLast4" TEXT,
    "paymentMethodExpMonth" INTEGER,
    "paymentMethodExpYear" INTEGER,
    "currentPeriodEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "grantedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipInvoice" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "stripeInvoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "InvoiceStatus" NOT NULL,
    "description" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Membership_businessId_key" ON "Membership"("businessId");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE INDEX "Membership_stripeCustomerId_idx" ON "Membership"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipInvoice_stripeInvoiceId_key" ON "MembershipInvoice"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "MembershipInvoice_membershipId_createdAt_idx" ON "MembershipInvoice"("membershipId", "createdAt");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvoice" ADD CONSTRAINT "MembershipInvoice_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

