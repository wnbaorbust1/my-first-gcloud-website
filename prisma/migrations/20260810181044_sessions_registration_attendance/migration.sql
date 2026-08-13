/*
  Warnings:

  - You are about to drop the column `isPrivate` on the `FacilitatorNote` table. All the data in the column will be lost.
  - You are about to drop the column `stage` on the `SessionOffering` table. All the data in the column will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `sessionType` to the `SessionOffering` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionFormat" AS ENUM ('VIRTUAL', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "FacilitatorNoteType" AS ENUM ('PRIVATE', 'PARTICIPANT_VISIBLE', 'RECOMMENDATION', 'TASK_RECOMMENDATION');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RegistrationStatus" ADD VALUE 'ATTENDED';
ALTER TYPE "RegistrationStatus" ADD VALUE 'NO_SHOW';
ALTER TYPE "RegistrationStatus" ADD VALUE 'COMPLETED';

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_registrationId_fkey";

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "builderAccessEligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualifyingSessionRegistrationId" TEXT,
ADD COLUMN     "sessionCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "FacilitatorNote" DROP COLUMN "isPrivate",
ADD COLUMN     "assignedPriority" "TaskPriority",
ADD COLUMN     "noteType" "FacilitatorNoteType" NOT NULL DEFAULT 'PRIVATE',
ADD COLUMN     "sessionRegistrationId" TEXT;

-- AlterTable
ALTER TABLE "SessionOffering" DROP COLUMN "stage",
ADD COLUMN     "facilitatorId" TEXT,
ADD COLUMN     "format" "SessionFormat" NOT NULL DEFAULT 'VIRTUAL',
ADD COLUMN     "learningOutcomes" JSONB,
ADD COLUMN     "preparationInstructions" TEXT,
ADD COLUMN     "priceCents" INTEGER,
ADD COLUMN     "registrationDeadline" TIMESTAMP(3),
ADD COLUMN     "resources" JSONB,
ADD COLUMN     "sessionType" "RecommendedSessionType" NOT NULL,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
ADD COLUMN     "topics" JSONB,
ADD COLUMN     "virtualLink" TEXT,
ADD COLUMN     "whatToBring" TEXT,
ADD COLUMN     "whatYoullBuild" TEXT,
ADD COLUMN     "whoShouldAttend" TEXT;

-- AlterTable
ALTER TABLE "SessionRegistration" ADD COLUMN     "attendanceNotes" TEXT,
ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "waitlistPosition" INTEGER;

-- DropTable
DROP TABLE "Attendance";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- CreateTable
CREATE TABLE "PostSessionSummary" (
    "id" TEXT NOT NULL,
    "sessionRegistrationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "facilitatorId" TEXT,
    "top3Priorities" JSONB NOT NULL,
    "goal30Day" TEXT,
    "goal60Day" TEXT,
    "goal90Day" TEXT,
    "recommendedTasks" JSONB,
    "recommendedResources" JSONB,
    "nextSuggestedSessionType" "RecommendedSessionType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSessionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostSessionSummary_sessionRegistrationId_key" ON "PostSessionSummary"("sessionRegistrationId");

-- CreateIndex
CREATE INDEX "PostSessionSummary_businessId_idx" ON "PostSessionSummary"("businessId");

-- CreateIndex
CREATE INDEX "FacilitatorNote_sessionRegistrationId_idx" ON "FacilitatorNote"("sessionRegistrationId");

-- CreateIndex
CREATE INDEX "SessionOffering_sessionType_idx" ON "SessionOffering"("sessionType");

-- CreateIndex
CREATE INDEX "SessionRegistration_sessionId_status_idx" ON "SessionRegistration"("sessionId", "status");

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_qualifyingSessionRegistrationId_fkey" FOREIGN KEY ("qualifyingSessionRegistrationId") REFERENCES "SessionRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionOffering" ADD CONSTRAINT "SessionOffering_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSessionSummary" ADD CONSTRAINT "PostSessionSummary_sessionRegistrationId_fkey" FOREIGN KEY ("sessionRegistrationId") REFERENCES "SessionRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSessionSummary" ADD CONSTRAINT "PostSessionSummary_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSessionSummary" ADD CONSTRAINT "PostSessionSummary_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSessionSummary" ADD CONSTRAINT "PostSessionSummary_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitatorNote" ADD CONSTRAINT "FacilitatorNote_sessionRegistrationId_fkey" FOREIGN KEY ("sessionRegistrationId") REFERENCES "SessionRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
