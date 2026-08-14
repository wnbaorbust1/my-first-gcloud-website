-- CreateEnum
CREATE TYPE "AffirmationEventType" AS ENUM ('SPOKEN', 'REFLECTION', 'CONNECTED_ACTION', 'FAVORITED');

-- CreateEnum
CREATE TYPE "Mood" AS ENUM ('FOCUSED', 'CONFIDENT', 'EXCITED', 'OVERWHELMED', 'CONFUSED', 'DISCOURAGED', 'TIRED', 'STUCK', 'READY_TO_WORK', 'NEED_SMALLER_STEP');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PointsAction" ADD VALUE 'AFFIRMATION_SPOKEN';
ALTER TYPE "PointsAction" ADD VALUE 'AFFIRMATION_REFLECTION';
ALTER TYPE "PointsAction" ADD VALUE 'AFFIRMATION_CONNECTED_ACTION';
ALTER TYPE "PointsAction" ADD VALUE 'AFFIRMATION_CREATED';
ALTER TYPE "PointsAction" ADD VALUE 'SEVEN_DAY_CHECKIN_STREAK';
ALTER TYPE "PointsAction" ADD VALUE 'MINDSET_CHALLENGE_30_DAY';

-- AlterTable
ALTER TABLE "PointsLedger" ADD COLUMN     "countsTowardLevel" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Affirmation" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "stage" "BlueprintStage",
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Affirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffirmationEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "affirmationId" TEXT NOT NULL,
    "type" "AffirmationEventType" NOT NULL,
    "day" DATE NOT NULL,
    "reflection" TEXT,
    "connectedTaskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffirmationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoodCheckIn" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "mood" "Mood" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Affirmation_stage_idx" ON "Affirmation"("stage");

-- CreateIndex
CREATE INDEX "AffirmationEvent_businessId_idx" ON "AffirmationEvent"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "AffirmationEvent_businessId_affirmationId_type_day_key" ON "AffirmationEvent"("businessId", "affirmationId", "type", "day");

-- CreateIndex
CREATE INDEX "MoodCheckIn_businessId_idx" ON "MoodCheckIn"("businessId");

-- AddForeignKey
ALTER TABLE "AffirmationEvent" ADD CONSTRAINT "AffirmationEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffirmationEvent" ADD CONSTRAINT "AffirmationEvent_affirmationId_fkey" FOREIGN KEY ("affirmationId") REFERENCES "Affirmation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoodCheckIn" ADD CONSTRAINT "MoodCheckIn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
