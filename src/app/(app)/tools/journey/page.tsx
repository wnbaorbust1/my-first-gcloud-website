import { Lock, Map as MapIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { ensureJourneyStagesSeeded } from "@/lib/tools/journey";
import { AddStageForm } from "./add-stage-form";
import { JourneyStageRow } from "./journey-stage-row";

export const metadata: Metadata = { title: "Customer Journey — Blueprint" };
export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Journey Builder unlocks after your Blueprint Session"
        description="Map your customer's real path once Builder access is unlocked."
        action={
          <Button asChild size="sm">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        }
      />
    );
  }
  if (access.locked) return <MembershipLockedNotice />;

  const businessId = ub!.business.id;
  await ensureJourneyStagesSeeded(businessId);

  const stages = await prisma.journeyStage.findMany({
    where: { businessId },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Customer Journey</h1>
      <p className="mt-1 text-foreground-muted">
        The path a customer takes with {ub!.business.name}, from first contact to referral —
        fully yours to customize.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {stages.length === 0 ? (
          <EmptyState icon={MapIcon} title="Build Your Customer Journey" />
        ) : (
          stages.map((stage, index) => (
            <JourneyStageRow
              key={stage.id}
              id={stage.id}
              name={stage.name}
              description={stage.description}
              index={index}
              prevId={stages[index - 1]?.id ?? null}
              nextId={stages[index + 1]?.id ?? null}
            />
          ))
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Add a Stage</CardTitle>
        </CardHeader>
        <AddStageForm businessId={businessId} />
      </Card>
    </div>
  );
}
