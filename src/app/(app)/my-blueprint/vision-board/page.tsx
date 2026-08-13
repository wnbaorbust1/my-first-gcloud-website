import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { VisionBoardForm, type VisionBoardProfileValues } from "./vision-board-form";

export const metadata: Metadata = { title: "Vision Board Profile — My Blueprint" };
export const dynamic = "force-dynamic";

export default async function VisionBoardProfilePage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: { include: { visionBoardProfile: true } } },
  });

  if (!membership) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Set up your business first"
        description="Your vision board fills in from your business profile — start there."
        action={
          <Button asChild size="sm">
            <Link href="/business-profile">Create My Business Profile</Link>
          </Button>
        }
      />
    );
  }

  const profile = membership.business.visionBoardProfile;
  const initial: VisionBoardProfileValues = {
    vibes: profile?.vibes ?? "",
    resourcesHave: profile?.resourcesHave ?? "",
    resourcesNeed: profile?.resourcesNeed ?? "",
    bmcKeyPartners: profile?.bmcKeyPartners ?? "",
    bmcKeyActivities: profile?.bmcKeyActivities ?? "",
    bmcValue: profile?.bmcValue ?? "",
    bmcCustomers: profile?.bmcCustomers ?? "",
    bmcChannels: profile?.bmcChannels ?? "",
    bmcRevenueStreams: profile?.bmcRevenueStreams ?? "",
    bmcCostStructure: profile?.bmcCostStructure ?? "",
    dailyAffirmations: profile?.dailyAffirmations ?? "",
    accountabilityPartnerName: profile?.accountabilityPartnerName ?? "",
    accountabilityPartnerContact: profile?.accountabilityPartnerContact ?? "",
    accountabilityCommitment: profile?.accountabilityCommitment ?? "",
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/my-blueprint" className="text-sm font-medium text-navy-500 hover:text-navy-800">
        ← Back to My Blueprint
      </Link>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy-900">Vision Board Profile</h1>
      <p className="mt-1 text-foreground-muted">
        These fields feed your Vision Board export — fill in what applies to you. Nothing here is
        required, and nothing is ever invented on your behalf: whatever you leave blank stays blank
        in your export.
      </p>

      <div className="mt-8">
        <VisionBoardForm businessId={membership.businessId} initial={initial} />
      </div>
    </div>
  );
}
