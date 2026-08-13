import { ArrowLeft, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { RevenuePlannerForm } from "./revenue-planner-form";

export const metadata: Metadata = { title: "Revenue Planner — Blueprint" };
export const dynamic = "force-dynamic";

export default async function RevenuePlannerPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Revenue Planner unlocks after your Blueprint Session"
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }
  if (access.locked) return <MembershipLockedNotice />;

  const history = await prisma.revenuePlan.findMany({
    where: { businessId: ub!.businessId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/money"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Money
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-navy-900">Revenue Planner</h1>
      <p className="text-sm text-foreground-muted">
        Set a revenue goal and see exactly how many sales, leads, and weekly/monthly progress it
        takes to hit it.
      </p>

      <Card className="mt-6">
        <RevenuePlannerForm businessId={ub!.businessId} />
      </Card>

      {history.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Previous Plans</CardTitle>
          </CardHeader>
          <div className="flex flex-col gap-3">
            {history.map((p) => (
              <div key={p.id} className="rounded-xl bg-navy-50 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-navy-900">
                    Goal: {formatCents(p.revenueGoalCents)}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {p.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-navy-700 sm:grid-cols-4">
                  <div>
                    <p className="text-foreground-muted">Sales Needed</p>
                    <p className="font-semibold">{p.salesNeeded}</p>
                  </div>
                  <div>
                    <p className="text-foreground-muted">Leads Needed</p>
                    <p className="font-semibold">{p.leadsNeeded}</p>
                  </div>
                  <div>
                    <p className="text-foreground-muted">Weekly Target</p>
                    <p className="font-semibold">{formatCents(p.weeklyTargetCents)}</p>
                  </div>
                  <div>
                    <p className="text-foreground-muted">Monthly Target</p>
                    <p className="font-semibold">{formatCents(p.monthlyTargetCents)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
