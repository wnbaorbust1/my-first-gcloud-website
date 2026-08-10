import { Compass, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RoadmapItem, type RoadmapItemStatus } from "@/components/ui/roadmap-item";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import type { Stage } from "@/lib/utils";

export const metadata: Metadata = { title: "My Roadmap — Blueprint" };
export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, RoadmapItemStatus> = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "CURRENT",
  NOT_STARTED: "NOT_STARTED",
  LOCKED: "LOCKED",
};

export default async function RoadmapPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership) {
    return (
      <EmptyState
        icon={Compass}
        title="Set up your business first"
        description="Your roadmap builds around your business profile and assessment."
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
        title="Your roadmap unlocks after your Blueprint Session"
        description="Complete your assessment and attend your recommended session to unlock a personalized roadmap."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: { businessId: membership.businessId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!roadmap || roadmap.tasks.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Your facilitator is preparing your Blueprint Roadmap"
        description="Check back soon — your personalized tasks are on their way."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">My Roadmap</h1>
      <p className="mt-1 text-foreground-muted">
        Your personalized, stage-by-stage path — ordered around where your business needs it most.
      </p>

      <div className="mt-8 rounded-2xl border border-navy-100 bg-surface p-6">
        {roadmap.tasks.map((task, i) => (
          <RoadmapItem
            key={task.id}
            title={task.title}
            stage={task.stage as Stage}
            status={STATUS_MAP[task.status] ?? "NOT_STARTED"}
            isLast={i === roadmap.tasks.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
