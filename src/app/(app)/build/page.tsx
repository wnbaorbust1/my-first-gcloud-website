import { CheckCircle2, Circle, Hammer, Lock, PauseCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StageBadge } from "@/components/ui/stage-badge";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cn, type Stage } from "@/lib/utils";

export const metadata: Metadata = { title: "Business Builder — Blueprint" };
export const dynamic = "force-dynamic";

const STATUS_META = {
  COMPLETED: { icon: CheckCircle2, label: "Complete", className: "text-success" },
  IN_PROGRESS: { icon: Circle, label: "In Progress", className: "text-gold-600" },
  NOT_STARTED: { icon: Circle, label: "Ready", className: "text-navy-400" },
  LOCKED: { icon: Lock, label: "Locked", className: "text-navy-300" },
  PAUSED: { icon: PauseCircle, label: "Paused", className: "text-navy-300" },
} as const;

export default async function BuildPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: true },
  });

  if (!membership?.business.builderAccessEligible) {
    return (
      <EmptyState
        icon={Hammer}
        title="Business Builder unlocks after your Blueprint Session"
        description="Complete your assessment and attend your recommended session to unlock hands-on Builder activities."
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
        icon={Hammer}
        title="Your facilitator is preparing your Blueprint Roadmap"
        description="Check back soon — your personalized Builder activities are on their way."
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Business Builder</h1>
      <p className="mt-1 text-foreground-muted">
        Work through your roadmap one task at a time — each one feeds directly into your Business
        Blueprint.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {roadmap.tasks.map((task) => {
          const meta = STATUS_META[task.status];
          const Icon = meta.icon;
          const actionable = task.status === "NOT_STARTED" || task.status === "IN_PROGRESS";

          const card = (
            <div
              className={cn(
                "flex items-center gap-4 rounded-xl border border-navy-100 bg-surface p-4 transition-colors",
                actionable && "hover:border-navy-300",
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", meta.className)} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <StageBadge stage={task.stage as Stage} />
                  <span className="text-xs text-foreground-muted">{task.category}</span>
                </div>
                <p
                  className={cn(
                    "truncate text-sm font-semibold",
                    task.status === "LOCKED" ? "text-navy-300" : "text-navy-900",
                  )}
                >
                  {task.title}
                </p>
              </div>
              <span className={cn("shrink-0 text-xs font-semibold", meta.className)}>
                {meta.label}
              </span>
            </div>
          );

          return actionable ? (
            <Link key={task.id} href={`/build/${task.id}`}>
              {card}
            </Link>
          ) : (
            <div key={task.id}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
