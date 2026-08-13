import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  VisionBoardForm,
  type VisionBoardProfileValues,
} from "@/app/(app)/my-blueprint/vision-board/vision-board-form";
import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/rbac";
import { requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Vision Board Profile — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminVisionBoardPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  await requireRole(ADMIN_ROLES, "/admin/businesses");

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { visionBoardProfile: true },
  });
  if (!business) notFound();

  const profile = business.visionBoardProfile;
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
      <Link
        href={`/admin/businesses/${businessId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to {business.name}
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">
        {business.name}&apos;s Vision Board Profile
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Editing as an admin. Nothing here is invented on the member&apos;s behalf — leave a field
        blank if you don&apos;t have real information for it.
      </p>

      <div className="mt-6">
        <VisionBoardForm businessId={businessId} initial={initial} />
      </div>
    </div>
  );
}
