-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('NONPROFIT', 'SCHOOL', 'COLLEGE', 'GOVERNMENT_PROGRAM', 'CHAMBER', 'INCUBATOR', 'VETERAN_PROGRAM', 'WOMENS_ENTREPRENEURSHIP_PROGRAM', 'CORPORATE_PROGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "CohortStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "jobsCreatedSelfReported" INTEGER;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "sponsorOrganizationId" TEXT,
ADD COLUMN     "sponsoredUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "allowIndividualParticipantData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "brandedFromEmail" TEXT,
ADD COLUMN     "brandedFromName" TEXT,
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "type" "OrganizationType";

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CohortStatus" NOT NULL DEFAULT 'PLANNED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortMembership" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cohort_organizationId_idx" ON "Cohort"("organizationId");

-- CreateIndex
CREATE INDEX "CohortMembership_businessId_idx" ON "CohortMembership"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CohortMembership_cohortId_businessId_key" ON "CohortMembership"("cohortId", "businessId");

-- CreateIndex
CREATE INDEX "Membership_sponsorOrganizationId_idx" ON "Membership"("sponsorOrganizationId");

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMembership" ADD CONSTRAINT "CohortMembership_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMembership" ADD CONSTRAINT "CohortMembership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_sponsorOrganizationId_fkey" FOREIGN KEY ("sponsorOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

