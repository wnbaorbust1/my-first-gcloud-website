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

import { PricingBuilderForm } from "./pricing-builder-form";

export const metadata: Metadata = { title: "Pricing Builder — Blueprint" };
export const dynamic = "force-dynamic";

export default async function PricingBuilderPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Pricing Builder unlocks after your Blueprint Session"
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }
  if (access.locked) return <MembershipLockedNotice />;

  const history = await prisma.pricingPlan.findMany({
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

      <h1 className="mt-4 font-display text-2xl font-semibold text-navy-900">Pricing Builder</h1>
      <p className="text-sm text-foreground-muted">
        An estimated sustainable pricing range for one offer — not a guaranteed market price.
      </p>

      <Card className="mt-6">
        <PricingBuilderForm businessId={ub!.businessId} />
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
                  <p className="font-semibold text-navy-900">{p.offerName}</p>
                  <p className="text-xs text-foreground-muted">
                    {p.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <p className="mt-1 text-sm font-semibold text-gold-700">
                  {formatCents(p.estimatedLowCents)} – {formatCents(p.estimatedHighCents)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
