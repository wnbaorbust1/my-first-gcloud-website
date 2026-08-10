import { Calculator, Lock, Target, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Money — Blueprint" };
export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="Money tools unlock after your Blueprint Session"
        description="The Revenue Planner and Pricing Builder use your real business data — complete your assessment and attend your recommended session to unlock them."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }
  if (access.locked) return <MembershipLockedNotice />;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Money</h1>
      <p className="mt-1 text-foreground-muted">
        Real calculators for {ub!.business.name} — grounded in your numbers, not guesses.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/money/revenue-planner">
          <Card className="h-full transition-colors hover:border-navy-300">
            <CardHeader className="flex-row items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                <Target className="h-4 w-4" aria-hidden="true" />
              </span>
              <CardTitle className="text-base">Revenue Planner</CardTitle>
            </CardHeader>
            <p className="text-sm text-foreground-muted">
              Turn a revenue goal into the sales, leads, and weekly/monthly targets it actually
              takes to get there.
            </p>
          </Card>
        </Link>
        <Link href="/money/pricing-builder">
          <Card className="h-full transition-colors hover:border-navy-300">
            <CardHeader className="flex-row items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-50 text-gold-600">
                <Calculator className="h-4 w-4" aria-hidden="true" />
              </span>
              <CardTitle className="text-base">Pricing Builder</CardTitle>
            </CardHeader>
            <p className="text-sm text-foreground-muted">
              An estimated sustainable pricing range based on your costs, profit goal, and
              capacity.
            </p>
          </Card>
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2 text-xs text-foreground-muted">
        <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
        Every calculation is saved so you can see how your thinking has changed over time.
      </div>
    </div>
  );
}
