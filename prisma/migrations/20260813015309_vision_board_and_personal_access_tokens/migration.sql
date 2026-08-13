-- CreateTable
CREATE TABLE "PersonalAccessToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "PersonalAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionBoardProfile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "vibes" TEXT,
    "resourcesHave" TEXT,
    "resourcesNeed" TEXT,
    "bmcKeyPartners" TEXT,
    "bmcKeyActivities" TEXT,
    "bmcValue" TEXT,
    "bmcCustomers" TEXT,
    "bmcChannels" TEXT,
    "bmcRevenueStreams" TEXT,
    "bmcCostStructure" TEXT,
    "dailyAffirmations" TEXT,
    "accountabilityPartnerName" TEXT,
    "accountabilityPartnerContact" TEXT,
    "accountabilityCommitment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisionBoardProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PersonalAccessToken_tokenHash_key" ON "PersonalAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PersonalAccessToken_userId_idx" ON "PersonalAccessToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VisionBoardProfile_businessId_key" ON "VisionBoardProfile"("businessId");

-- AddForeignKey
ALTER TABLE "PersonalAccessToken" ADD CONSTRAINT "PersonalAccessToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionBoardProfile" ADD CONSTRAINT "VisionBoardProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
