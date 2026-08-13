-- CreateTable
CREATE TABLE "VisionBoardVersion" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisionBoardVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisionBoardVersion_businessId_idx" ON "VisionBoardVersion"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "VisionBoardVersion_businessId_version_key" ON "VisionBoardVersion"("businessId", "version");

-- AddForeignKey
ALTER TABLE "VisionBoardVersion" ADD CONSTRAINT "VisionBoardVersion_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardVersion" ADD CONSTRAINT "VisionBoardVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
