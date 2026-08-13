import { BookOpen, FileText, Lock, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { getMyBlueprintData } from "@/lib/blueprint/data";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STAGE_META, STAGES } from "@/lib/utils";

import { SectionCard } from "./section-card";

export const metadata: Metadata = { title: "My Blueprint — Blueprint" };
export const dynamic = "force-dynamic";

export default async function MyBlueprintPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Set up your business first"
        description="My Blueprint fills in as you build your business — start with your business profile."
        action={
          <Button asChild size="sm">
            <Link href="/business-profile">Create My Business Profile</Link>
          </Button>
        }
      />
    );
  }

  if (!membership.business.builderAccessEligible) {
    return (
      <EmptyState
        icon={Lock}
        title="My Blueprint unlocks after your Blueprint Session"
        description="This is where every Builder activity you complete lives — your growing business book. Complete your assessment and attend your recommended session to get started."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }

  const billingMembership = await getSyncedMembership(membership.businessId);
  const access = getBuilderAccessState(membership.business.builderAccessEligible, billingMembership);
  if (access.locked) return <MembershipLockedNotice />;

  const sectionsByStage = await getMyBlueprintData(membership.businessId);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-navy-900">My Blueprint</h1>
          <p className="mt-1 max-w-xl text-foreground-muted">
            {membership.business.name}&apos;s growing business book — every Builder activity you
            complete or edit lives here, organized by Passion, Power, and Legacy.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/my-blueprint/vision-board/view">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              My Vision Board
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/my-blueprint/vision-board">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Edit Vision Board
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/my-blueprint/scorecard">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Scorecard
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/my-blueprint/documents">
              <FileText className="h-4 w-4" aria-hidden="true" />
              Documents
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="PASSION" className="mt-8">
        <TabsList>
          {STAGES.map((stage) => (
            <TabsTrigger key={stage} value={stage}>
              <span aria-hidden="true">{STAGE_META[stage].icon}</span> {STAGE_META[stage].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STAGES.map((stage) => (
          <TabsContent key={stage} value={stage}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sectionsByStage[stage].map((section) => (
                <SectionCard
                  key={section.title}
                  businessId={membership.businessId}
                  title={section.title}
                  content={section.content}
                  lastEditedAt={section.lastEditedAt?.toISOString() ?? null}
                  updatedAt={section.updatedAt?.toISOString() ?? null}
                  sourceTask={section.sourceTask}
                  builderTask={
                    section.builderTask?.status === "COMPLETED" ? null : section.builderTask
                  }
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
