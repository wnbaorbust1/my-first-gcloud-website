-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "stageOverriddenAt" TIMESTAMP(3),
ADD COLUMN     "stageOverriddenByUserId" TEXT,
ADD COLUMN     "stageOverrideNote" TEXT,
ADD COLUMN     "systemRecommendedSessionType" "RecommendedSessionType";

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_stageOverriddenByUserId_fkey" FOREIGN KEY ("stageOverriddenByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
