-- CreateEnum
CREATE TYPE "TaskDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "TaskImpact" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'PAUSED';

-- DropIndex
DROP INDEX "TaskResponse_roadmapTaskId_idx";

-- AlterTable
ALTER TABLE "DocumentSection" ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "sourceRoadmapTaskId" TEXT;

-- AlterTable
ALTER TABLE "RoadmapTask" ADD COLUMN     "category" TEXT,
ADD COLUMN     "facilitatorAdjusted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TaskResponse" DROP COLUMN "content",
ADD COLUMN     "answers" JSONB NOT NULL,
ADD COLUMN     "savedToBlueprintAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TaskTemplate" DROP COLUMN "description",
ADD COLUMN     "blueprintDestination" TEXT,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "difficulty" "TaskDifficulty" NOT NULL DEFAULT 'BEGINNER',
ADD COLUMN     "impact" "TaskImpact" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "implementGuidance" TEXT,
ADD COLUMN     "instructions" JSONB NOT NULL,
ADD COLUMN     "measurePrompt" TEXT,
ADD COLUMN     "outputType" TEXT NOT NULL DEFAULT 'structured_fields',
ADD COLUMN     "thinkPrompt" TEXT,
ADD COLUMN     "whyItMatters" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "_TaskTemplatePrerequisites" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TaskTemplatePrerequisites_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_TaskTemplatePrerequisites_B_index" ON "_TaskTemplatePrerequisites"("B");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSection_documentId_title_key" ON "DocumentSection"("documentId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "TaskResponse_roadmapTaskId_key" ON "TaskResponse"("roadmapTaskId");

-- AddForeignKey
ALTER TABLE "_TaskTemplatePrerequisites" ADD CONSTRAINT "_TaskTemplatePrerequisites_A_fkey" FOREIGN KEY ("A") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TaskTemplatePrerequisites" ADD CONSTRAINT "_TaskTemplatePrerequisites_B_fkey" FOREIGN KEY ("B") REFERENCES "TaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

