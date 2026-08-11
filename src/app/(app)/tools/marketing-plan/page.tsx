import { Lock, Megaphone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { DeleteButton } from "@/components/tools/delete-button";
import { EditToolModal, type EditField } from "@/components/tools/edit-tool-modal";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { CreateMarketingPlanForm } from "./create-marketing-plan-form";

const MARKETING_PLAN_EDIT_FIELDS: EditField[] = [
  { key: "goal", label: "Goal", type: "textarea", rows: 2, maxLength: 1000 },
  { key: "audience", label: "Audience", type: "textarea", rows: 2, maxLength: 2000 },
  { key: "channels", label: "Channels", type: "textarea", rows: 2, maxLength: 2000 },
  { key: "contentPillars", label: "Content Pillars", type: "textarea", rows: 2, maxLength: 2000 },
  { key: "leadMagnet", label: "Lead Magnet", type: "textarea", rows: 2, maxLength: 1000 },
  { key: "campaign", label: "Campaign", type: "textarea", rows: 2, maxLength: 2000 },
  { key: "cta", label: "Call to Action", type: "text", maxLength: 200 },
  { key: "metrics", label: "Metrics", type: "textarea", rows: 2, maxLength: 1000 },
];

export const metadata: Metadata = { title: "Marketing Plan — Blueprint" };
export const dynamic = "force-dynamic";

export default async function MarketingPlanPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Marketing Plan Builder unlocks after your Blueprint Session"
        description="Plan how people find and hear from you once Builder access is unlocked."
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
  const plans = await prisma.marketingPlan.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Marketing Plan Builder</h1>
      <p className="mt-1 text-foreground-muted">
        Turn how {ub!.business.name} gets found into a written plan.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {plans.length === 0 ? (
          <EmptyState icon={Megaphone} title="Build Your Marketing Plan" />
        ) : (
          plans.map((plan) => (
            <Card key={plan.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {plan.goal && <p className="text-sm font-semibold text-navy-900">{plan.goal}</p>}
                  {plan.audience && (
                    <p className="mt-1 text-sm text-foreground-muted">Audience: {plan.audience}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                    {plan.channels && <span>Channels: {plan.channels}</span>}
                    {plan.leadMagnet && <span>Lead Magnet: {plan.leadMagnet}</span>}
                    {plan.cta && <span>CTA: {plan.cta}</span>}
                  </div>
                  {plan.metrics && (
                    <p className="mt-1 text-xs text-foreground-muted">Metrics: {plan.metrics}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <EditToolModal
                    endpoint={`/api/tools/marketing-plan/${plan.id}`}
                    title="Edit Marketing Plan"
                    fields={MARKETING_PLAN_EDIT_FIELDS}
                    initialValues={{
                      goal: plan.goal,
                      audience: plan.audience,
                      channels: plan.channels,
                      contentPillars: plan.contentPillars,
                      leadMagnet: plan.leadMagnet,
                      campaign: plan.campaign,
                      cta: plan.cta,
                      metrics: plan.metrics,
                    }}
                  />
                  <DeleteButton endpoint={`/api/tools/marketing-plan/${plan.id}`} />
                </div>
              </div>
            </Card>
          ))
        )}

        <Card>
          <CardHeader>
            <CardTitle>{plans.length === 0 ? "Create Your Plan" : "Add Another Plan"}</CardTitle>
          </CardHeader>
          <CreateMarketingPlanForm businessId={businessId} />
        </Card>
      </div>
    </div>
  );
}
