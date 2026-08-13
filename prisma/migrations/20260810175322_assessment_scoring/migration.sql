/*
  Warnings:

  - Added the required column `category` to the `AssessmentQuestion` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `value` on the `AssessmentResponse` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RecommendedSessionType" AS ENUM ('PASSION', 'POWER', 'LEGACY', 'GROWTH');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SCALE_1_5', 'YES_NO', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'NUMBER');

-- DropIndex
DROP INDEX "AssessmentQuestion_stage_order_idx";

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "assessmentVersion" TEXT NOT NULL DEFAULT 'v1',
ADD COLUMN     "healthScorePercent" INTEGER,
ADD COLUMN     "recommendationReason" TEXT,
ADD COLUMN     "recommendedSessionType" "RecommendedSessionType";

-- AlterTable
ALTER TABLE "AssessmentQuestion" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "includeInScoring" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxValue" INTEGER,
ADD COLUMN     "minValue" INTEGER,
ADD COLUMN     "options" JSONB,
ADD COLUMN     "questionType" "QuestionType" NOT NULL DEFAULT 'SCALE_1_5',
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "AssessmentResponse" DROP COLUMN "value",
ADD COLUMN     "value" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "AssessmentCategoryScore" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "stage" "BlueprintStage" NOT NULL,
    "category" TEXT NOT NULL,
    "scorePercent" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentCategoryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentScoringConfig" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" TEXT NOT NULL DEFAULT 'v1',
    "stageThresholds" JSONB NOT NULL,
    "excellenceThreshold" INTEGER NOT NULL DEFAULT 85,
    "stageWeights" JSONB NOT NULL,
    "statusBands" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentCategoryScore_assessmentId_idx" ON "AssessmentCategoryScore"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentCategoryScore_assessmentId_category_key" ON "AssessmentCategoryScore"("assessmentId", "category");

-- CreateIndex
CREATE INDEX "AssessmentQuestion_stage_category_order_idx" ON "AssessmentQuestion"("stage", "category", "order");

-- AddForeignKey
ALTER TABLE "AssessmentCategoryScore" ADD CONSTRAINT "AssessmentCategoryScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
