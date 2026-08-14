import { Compass, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RoadmapItem, type RoadmapItemStatus } from "@/components/ui/roadmap-item";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { ResumeTaskButton } from "@/components/roadmap/resume-task-button";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STAGES, STAGE_META, type Stage } from "@/lib/utils";

export const metadata: Metadata = { title: "My Roadmap — Blueprint" };
export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, RoadmapItemStatus> = {
  COMPLETED: "COMPLETED",
  IN_PROGRESS: "CURRENT",
  NOT_STARTED: "NOT_STARTED",
  LOCKED: "LOCKED",
  PAUSED: "PAUSED",
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

  const billingMembership = await getSyncedMembership(membership.businessId);
  const access = getBuilderAccessState(membership.business.builderAccessEligible, billingMembership);
  if (access.locked) return <MembershipLockedNotice />;

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

  // Group by stage (spec/audit polish: a single 30-item scroll read more
  // like a plain checklist than a guided path — see the "Roadmap page is
  // one long undifferentiated list" finding). Order within each stage is
  // preserved from the roadmap's own `order`. The current stage — the
  // first stage that still has an actionable or locked-but-upcoming task
  // — opens by default; stages that are fully done or not yet reached
  // stay collapsed, using the browser's native <details> disclosure so
  // this needs no client JS and stays keyboard/screen-reader accessible.
  const tasksByStage = new Map<Stage, typeof roadmap.tasks>();
  for (const stage of STAGES) tasksByStage.set(stage, []);
  for (const task of roadmap.tasks) {
    tasksByStage.get(task.stage as Stage)?.push(task);
  }

  const currentStage =
    STAGES.find((stage) =>
      tasksByStage.get(stage)?.some((t) => t.status === "NOT_STARTED" || t.status === "IN_PROGRESS"),
    ) ?? STAGES.find((stage) => (tasksByStage.get(stage)?.length ?? 0) > 0);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">My Roadmap</h1>
      <p className="mt-1 text-foreground-muted">
        Your personalized, stage-by-stage path — ordered around where your business needs it most.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {STAGES.map((stage) => {
          const tasks = tasksByStage.get(stage) ?? [];
          if (tasks.length === 0) return null;
          const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
          const meta = STAGE_META[stage];

          return (
            <details
              key={stage}
              open={stage === currentStage}
              className="group rounded-2xl border border-navy-100 bg-surface open:pb-2"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 marker:content-none">
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true">{meta.icon}</span>
                  <span className="font-display text-lg font-semibold text-navy-900">
                    {meta.label}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-xs font-medium text-foreground-muted">
                  {completedCount} of {tasks.length} complete
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-4 w-4 shrink-0 text-navy-300 transition-transform group-open:rotate-180"
                  >
                    <path
                      d="M5 7.5 10 12.5 15 7.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </span>
              </summary>
              <div className="border-t border-navy-100 px-6 pt-5">
                {tasks.map((task, i) => {
                  const actionable = task.status === "NOT_STARTED" || task.status === "IN_PROGRESS";
                  const item = (
                    <RoadmapItem
                      title={task.title}
                      stage={task.stage as Stage}
                      status={STATUS_MAP[task.status] ?? "NOT_STARTED"}
                      isLast={i === tasks.length - 1}
                    />
                  );
                  if (actionable) {
                    return (
                      <Link key={task.id} href={`/build/${task.id}`} className="block hover:opacity-80">
                        {item}
                      </Link>
                    );
                  }
                  if (task.status === "PAUSED") {
                    return (
                      <div key={task.id} className="flex items-center justify-between gap-3">
                        {item}
                        <ResumeTaskButton taskId={task.id} />
                      </div>
                    );
                  }
                  return <div key={task.id}>{item}</div>;
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
