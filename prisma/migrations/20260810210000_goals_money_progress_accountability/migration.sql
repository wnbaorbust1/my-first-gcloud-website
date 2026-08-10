-- CreateEnum
CREATE TYPE "GoalCadence" AS ENUM ('WEEKLY', 'MONTHLY', 'NINETY_DAY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('REVENUE', 'PROFIT', 'LEADS', 'CUSTOMERS', 'LAUNCH', 'MARKETING', 'SYSTEMS', 'TEAM', 'PERSONAL_CEO');

-- CreateEnum
CREATE TYPE "MilestoneKey" AS ENUM ('MISSION_DEFINED', 'IDEAL_CUSTOMER_DEFINED', 'FIRST_OFFER', 'PRICING_COMPLETE', 'FIRST_LEAD_SYSTEM', 'FIRST_CUSTOMER', 'FIRST_1K', 'FIRST_5K_MONTH', 'FIRST_10K_MONTH', 'FIRST_SOP', 'FIRST_AUTOMATION', 'FIRST_CONTRACTOR', 'FIRST_EMPLOYEE', 'CEO_MODE', 'LEGACY_BUILDER');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "accountabilityCadence" TEXT,
ADD COLUMN     "accountabilityCustomDays" INTEGER,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "cadence" "GoalCadence" NOT NULL DEFAULT 'NINETY_DAY',
ADD COLUMN     "goalType" "GoalType" NOT NULL DEFAULT 'PERSONAL_CEO',
ADD COLUMN     "targetValue" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT;

-- CreateTable
CREATE TABLE "RevenuePlan" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "revenueGoalCents" INTEGER NOT NULL,
    "offerPriceCents" INTEGER NOT NULL,
    "conversionRatePercent" DOUBLE PRECISION NOT NULL,
    "workingWeeks" INTEGER NOT NULL,
    "salesNeeded" INTEGER NOT NULL,
    "leadsNeeded" INTEGER NOT NULL,
    "monthlyTargetCents" INTEGER NOT NULL,
    "weeklyTargetCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenuePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "offerName" TEXT NOT NULL,
    "deliveryTimeHours" DOUBLE PRECISION NOT NULL,
    "directCostsCents" INTEGER NOT NULL,
    "desiredProfitCents" INTEGER NOT NULL,
    "capacityPerMonth" INTEGER NOT NULL,
    "estimatedLowCents" INTEGER NOT NULL,
    "estimatedHighCents" INTEGER NOT NULL,
    "considerations" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekOf" TIMESTAMP(3) NOT NULL,
    "completed" TEXT,
    "slowedDown" TEXT,
    "biggestWin" TEXT,
    "biggestChallenge" TEXT,
    "leads" INTEGER,
    "sales" INTEGER,
    "revenueCents" INTEGER,
    "nextWeekFocus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMilestone" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "milestone" "MilestoneKey" NOT NULL,
    "achievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'auto',

    CONSTRAINT "BusinessMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenuePlan_businessId_createdAt_idx" ON "RevenuePlan"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PricingPlan_businessId_createdAt_idx" ON "PricingPlan"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_businessId_weekOf_idx" ON "WeeklyCheckIn"("businessId", "weekOf");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyCheckIn_businessId_weekOf_key" ON "WeeklyCheckIn"("businessId", "weekOf");

-- CreateIndex
CREATE INDEX "BusinessMilestone_businessId_idx" ON "BusinessMilestone"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessMilestone_businessId_milestone_key" ON "BusinessMilestone"("businessId", "milestone");

-- AddForeignKey
ALTER TABLE "RevenuePlan" ADD CONSTRAINT "RevenuePlan_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingPlan" ADD CONSTRAINT "PricingPlan_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCheckIn" ADD CONSTRAINT "WeeklyCheckIn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCheckIn" ADD CONSTRAINT "WeeklyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMilestone" ADD CONSTRAINT "BusinessMilestone_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

