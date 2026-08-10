import { Lock, Workflow } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { AutomationStepCard } from "./automation-step-card";
import { CreateStepForm } from "./create-step-form";

export const metadata: Metadata = { title: "Automation Mapper — Blueprint" };
export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Automation Mapper unlocks after your Blueprint Session"
        description="Map what should run automatically once Builder access is unlocked."
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
  const steps = await prisma.automationStep.findMany({
    where: { businessId },
    orderBy: { order: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Automation Mapper</h1>
      <p className="mt-1 text-foreground-muted">
        Map the sequence of what should happen automatically in {ub!.business.name} — one step
        triggers the next.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {steps.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="Map Your First Automation"
            description="Start with one trigger and one action — you can chain more steps after."
          />
        ) : (
          steps.map((step, index) => (
            <AutomationStepCard
              key={step.id}
              id={step.id}
              order={step.order}
              trigger={step.trigger}
              action={step.action}
              tool={step.tool}
              timing={step.timing}
              owner={step.owner}
              message={step.message}
              nextStep={step.nextStep}
              index={index}
              prevId={steps[index - 1]?.id ?? null}
              prevOrder={steps[index - 1]?.order ?? null}
              nextId={steps[index + 1]?.id ?? null}
              nextOrder={steps[index + 1]?.order ?? null}
            />
          ))
        )}

        <Card>
          <CardHeader>
            <CardTitle>{steps.length === 0 ? "Add Your First Step" : "Add Another Step"}</CardTitle>
          </CardHeader>
          <CreateStepForm businessId={businessId} />
        </Card>
      </div>
    </div>
  );
}
