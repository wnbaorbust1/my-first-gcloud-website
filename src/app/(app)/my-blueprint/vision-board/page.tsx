import { BookOpen, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { toFormValues } from "./form-values";
import { VisionBoardForm } from "./vision-board-form";

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

  // FULL-TIER GATE (Vision Board & Blueprint Generator, audited
  // 2026-08-13): "editing... remain[s] locked until a qualifying $150
  // Blueprint Session is marked completed." Reuses the exact same
  // builderAccessEligible + Membership check every other Builder surface
  // (roadmap, My Blueprint, Build) already uses — builderAccessEligible
  // itself now only flips true once that session is both attended AND
  // paid (see src/lib/sessions/qualification.ts), so this one check
  // already covers both "attended" and "paid," not just attendance.
  if (!membership.business.builderAccessEligible) {
    return (
      <EmptyState
        icon={Lock}
        title="Your Vision Board unlocks after your Blueprint Session"
        description="Complete your assessment and attend (and pay for) your recommended session to unlock full editing."
        action={
          <Button asChild size="sm">
            <Link href="/sessions">View Available Sessions</Link>
          </Button>
        }
      />
    );
  }
  const billingMembership = await getSyncedMembership(membership.businessId);
  const access = getBuilderAccessState(membership.business.builderAccessEligible, billingMembership);
  if (access.locked) return <MembershipLockedNotice />;

  const { initial, initialNext90Days, sectionSources } = toFormValues(membership.business.visionBoardProfile);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/my-blueprint" className="text-sm font-medium text-navy-500 hover:text-navy-800">
          ← Back to My Blueprint
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href="/my-blueprint/vision-board/view">View My Vision Board</Link>
        </Button>
      </div>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy-900">Vision Board Profile</h1>
      <p className="mt-1 text-foreground-muted">
        These fields feed your Vision Board — fill in what applies to you, or use AI Draft Assist
        below. Nothing here is required, and nothing is ever invented on your behalf: whatever you
        leave blank stays blank on your board.
      </p>

      <div className="mt-8">
        <VisionBoardForm
          businessId={membership.businessId}
          initial={initial}
          initialNext90Days={initialNext90Days}
          initialSectionSources={sectionSources}
        />
      </div>
    </div>
  );
}
