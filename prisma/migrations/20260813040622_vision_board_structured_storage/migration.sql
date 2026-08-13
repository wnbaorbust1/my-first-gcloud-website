/*
  Warnings:

  - You are about to drop the column `accountabilityCommitment` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `accountabilityPartnerContact` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `accountabilityPartnerName` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `actionPlanThisMonth` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `actionPlanThisWeek` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bmcChannels` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bmcCostStructure` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bmcCustomers` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bmcKeyActivities` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bmcKeyPartners` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bmcRevenueStreams` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `bmcValue` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `dailyAffirmations` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `legacyImpact` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `resourcesHave` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - You are about to drop the column `resourcesNeed` on the `VisionBoardProfile` table. All the data in the column will be lost.
  - The `vibes` column on the `VisionBoardProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `myStory` column on the `VisionBoardProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `myWhy` column on the `VisionBoardProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "visionBoardUnlockedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "VisionBoardProfile" DROP COLUMN "accountabilityCommitment",
DROP COLUMN "accountabilityPartnerContact",
DROP COLUMN "accountabilityPartnerName",
DROP COLUMN "actionPlanThisMonth",
DROP COLUMN "actionPlanThisWeek",
DROP COLUMN "bmcChannels",
DROP COLUMN "bmcCostStructure",
DROP COLUMN "bmcCustomers",
DROP COLUMN "bmcKeyActivities",
DROP COLUMN "bmcKeyPartners",
DROP COLUMN "bmcRevenueStreams",
DROP COLUMN "bmcValue",
DROP COLUMN "dailyAffirmations",
DROP COLUMN "legacyImpact",
DROP COLUMN "resourcesHave",
DROP COLUMN "resourcesNeed",
ADD COLUMN     "accountability" JSONB,
ADD COLUMN     "actionPlan" JSONB,
ADD COLUMN     "affirmations" JSONB,
ADD COLUMN     "blueprint" JSONB,
ADD COLUMN     "businessModelCanvas" JSONB,
ADD COLUMN     "lastEditedAt" TIMESTAMP(3),
ADD COLUMN     "lastEditedByUserId" TEXT,
ADD COLUMN     "legacy" JSONB,
ADD COLUMN     "resources" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "vibes",
ADD COLUMN     "vibes" JSONB,
DROP COLUMN "myStory",
ADD COLUMN     "myStory" JSONB,
DROP COLUMN "myWhy",
ADD COLUMN     "myWhy" JSONB;

-- CreateTable
CREATE TABLE "BoardDownload" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "document" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'print',
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardDownload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoardDownload_businessId_idx" ON "BoardDownload"("businessId");

-- CreateIndex
CREATE INDEX "BoardDownload_userId_idx" ON "BoardDownload"("userId");

-- AddForeignKey
ALTER TABLE "VisionBoardProfile" ADD CONSTRAINT "VisionBoardProfile_lastEditedByUserId_fkey" FOREIGN KEY ("lastEditedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardDownload" ADD CONSTRAINT "BoardDownload_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardDownload" ADD CONSTRAINT "BoardDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
