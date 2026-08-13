-- AlterTable
ALTER TABLE "SessionRegistration" ADD COLUMN     "amountPaidCents" INTEGER,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "VisionBoardProfile" ADD COLUMN     "actionPlanThisMonth" TEXT,
ADD COLUMN     "actionPlanThisWeek" TEXT,
ADD COLUMN     "legacyImpact" TEXT,
ADD COLUMN     "myStory" TEXT,
ADD COLUMN     "myWhy" TEXT;

-- CreateTable
CREATE TABLE "VisionBoardGeneration" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "generatedByUserId" TEXT,
    "model" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "promotedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisionBoardGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisionBoardGeneration_businessId_idx" ON "VisionBoardGeneration"("businessId");

-- CreateIndex
CREATE INDEX "VisionBoardGeneration_assessmentId_idx" ON "VisionBoardGeneration"("assessmentId");

-- AddForeignKey
ALTER TABLE "VisionBoardGeneration" ADD CONSTRAINT "VisionBoardGeneration_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardGeneration" ADD CONSTRAINT "VisionBoardGeneration_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardGeneration" ADD CONSTRAINT "VisionBoardGeneration_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
