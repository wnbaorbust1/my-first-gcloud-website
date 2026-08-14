-- CreateEnum
CREATE TYPE "ActionSize" AS ENUM ('QUICK', 'STANDARD', 'POWER');

-- CreateEnum
CREATE TYPE "WeekProgressStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "CurriculumWeek" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "stage" "BlueprintStage" NOT NULL,
    "topic" TEXT NOT NULL,
    "requiredAsset" TEXT NOT NULL,
    "lesson" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,
    "completedExample" TEXT NOT NULL,
    "weeklyReviewPrompt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAction" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "size" "ActionSize" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessWeekProgress" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "status" "WeekProgressStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewNote" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessWeekProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActionCompletion" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "dailyActionId" TEXT NOT NULL,
    "proofNote" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyActionCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumWeek_weekNumber_key" ON "CurriculumWeek"("weekNumber");

-- CreateIndex
CREATE INDEX "CurriculumWeek_stage_weekNumber_idx" ON "CurriculumWeek"("stage", "weekNumber");

-- CreateIndex
CREATE INDEX "DailyAction_weekId_idx" ON "DailyAction"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAction_weekId_dayNumber_key" ON "DailyAction"("weekId", "dayNumber");

-- CreateIndex
CREATE INDEX "BusinessWeekProgress_businessId_idx" ON "BusinessWeekProgress"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessWeekProgress_businessId_weekId_key" ON "BusinessWeekProgress"("businessId", "weekId");

-- CreateIndex
CREATE INDEX "DailyActionCompletion_businessId_idx" ON "DailyActionCompletion"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActionCompletion_businessId_dailyActionId_key" ON "DailyActionCompletion"("businessId", "dailyActionId");

-- AddForeignKey
ALTER TABLE "DailyAction" ADD CONSTRAINT "DailyAction_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "CurriculumWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessWeekProgress" ADD CONSTRAINT "BusinessWeekProgress_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessWeekProgress" ADD CONSTRAINT "BusinessWeekProgress_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "CurriculumWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActionCompletion" ADD CONSTRAINT "DailyActionCompletion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActionCompletion" ADD CONSTRAINT "DailyActionCompletion_dailyActionId_fkey" FOREIGN KEY ("dailyActionId") REFERENCES "DailyAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
