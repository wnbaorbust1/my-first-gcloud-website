import { Target } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { CreateGoalForm } from "./create-goal-form";
import { GoalProgressControl } from "./goal-progress-control";

export const metadata: Metadata = { title: "Goals — Blueprint" };
export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireUser();

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!membership) {
    return (
      <EmptyState
        icon={Target}
        title="Set up your business first"
        description="Goals live under your business profile."
        action={
          <Button asChild size="sm">
            <Link href="/business-profile">Create My Business Profile</Link>
          </Button>
        }
      />
    );
  }

  const goals = await prisma.goal.findMany({
    where: { businessId: membership.businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Goals</h1>
      <p className="mt-1 text-foreground-muted">
        Set and track your 90-day goals for {membership.business.name}.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {goals.map((goal) => (
          <Card key={goal.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={
                    goal.status === "COMPLETED"
                      ? "text-sm font-semibold text-navy-400 line-through"
                      : "text-sm font-semibold text-navy-900"
                  }
                >
                  {goal.title}
                </p>
                {goal.description && (
                  <p className="mt-1 text-sm text-foreground-muted">{goal.description}</p>
                )}
                {goal.targetDate && (
                  <p className="mt-1 text-xs text-foreground-muted">
                    Target:{" "}
                    {goal.targetDate.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              {goal.status !== "COMPLETED" && (
                <GoalProgressControl goalId={goal.id} progressPercent={goal.progressPercent} />
              )}
            </div>
            <ProgressBar value={goal.progressPercent} className="mt-3" showValue />
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>{goals.length === 0 ? "Set Your First 90-Day Goal" : "Add Another Goal"}</CardTitle>
          </CardHeader>
          <CreateGoalForm businessId={membership.businessId} />
        </Card>
      </div>
    </div>
  );
}
