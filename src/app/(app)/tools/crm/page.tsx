import { Lock, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MembershipLockedNotice } from "@/components/billing/membership-locked-notice";
import { DeleteButton } from "@/components/tools/delete-button";
import { EditToolModal, type EditField } from "@/components/tools/edit-tool-modal";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getGatedBusinessContext } from "@/lib/billing/access-guard";
import { formatCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { LEAD_STAGE_CLASSES, LEAD_STAGE_LABELS, LEAD_STAGE_ORDER } from "@/lib/tools/meta";

import { CreateLeadForm } from "./create-lead-form";
import { LeadStageControl } from "./lead-stage-control";

const LEAD_EDIT_FIELDS: EditField[] = [
  { key: "name", label: "Name", type: "text", required: true, maxLength: 200 },
  { key: "company", label: "Business", type: "text", maxLength: 200 },
  { key: "email", label: "Email", type: "text", maxLength: 200 },
  { key: "phone", label: "Phone", type: "text", maxLength: 50 },
  { key: "offer", label: "Offer", type: "text", maxLength: 200 },
  { key: "valueCents", label: "Value ($)", type: "money" },
  { key: "nextAction", label: "Next Action", type: "text", maxLength: 500 },
  { key: "notes", label: "Notes", type: "textarea", rows: 3, maxLength: 5000 },
];

export const metadata: Metadata = { title: "CRM — Blueprint" };
export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The CRM unlocks after your Blueprint Session"
        description="Track leads and deals against your real business once Builder access is unlocked."
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
  const leads = await prisma.lead.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  const openValueCents = leads
    .filter((l) => l.stage !== "WON" && l.stage !== "LOST")
    .reduce((sum, l) => sum + (l.valueCents ?? 0), 0);
  const wonValueCents = leads
    .filter((l) => l.stage === "WON")
    .reduce((sum, l) => sum + (l.valueCents ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">CRM</h1>
      <p className="mt-1 text-foreground-muted">
        Your lightweight pipeline for {ub!.business.name} — every lead, one place.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Leads</p>
          <p className="mt-1 text-2xl font-semibold text-navy-900">{leads.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Open Pipeline</p>
          <p className="mt-1 text-2xl font-semibold text-power-600">{formatCents(openValueCents)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Won</p>
          <p className="mt-1 text-2xl font-semibold text-legacy-600">{formatCents(wonValueCents)}</p>
        </Card>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        {leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Your Pipeline Starts Here"
            description="Add your first lead so Blueprint can help you track it from first contact to Won."
          />
        ) : (
          LEAD_STAGE_ORDER.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage);
            if (stageLeads.length === 0) return null;
            return (
              <div key={stage}>
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${LEAD_STAGE_CLASSES[stage]}`}
                  >
                    {LEAD_STAGE_LABELS[stage]}
                  </span>
                  <span className="text-xs text-foreground-muted">{stageLeads.length}</span>
                </div>
                <div className="flex flex-col gap-3">
                  {stageLeads.map((lead) => (
                    <Card key={lead.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-900">{lead.name}</p>
                          {lead.company && (
                            <p className="text-xs text-foreground-muted">{lead.company}</p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
                            {lead.email && <span>{lead.email}</span>}
                            {lead.phone && <span>{lead.phone}</span>}
                          </div>
                          {lead.offer && (
                            <p className="mt-1 text-xs font-medium text-navy-600">
                              Offer: {lead.offer}
                            </p>
                          )}
                          {lead.valueCents !== null && (
                            <p className="mt-0.5 text-xs font-medium text-navy-600">
                              Value: {formatCents(lead.valueCents)}
                            </p>
                          )}
                          {lead.nextAction && (
                            <p className="mt-1 text-xs text-power-700">
                              Next: {lead.nextAction}
                            </p>
                          )}
                          {lead.notes && (
                            <p className="mt-1 text-xs text-foreground-muted">{lead.notes}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <LeadStageControl leadId={lead.id} stage={lead.stage} />
                          <EditToolModal
                            endpoint={`/api/tools/leads/${lead.id}`}
                            title="Edit Lead"
                            fields={LEAD_EDIT_FIELDS}
                            initialValues={{
                              name: lead.name,
                              company: lead.company,
                              email: lead.email,
                              phone: lead.phone,
                              offer: lead.offer,
                              valueCents: lead.valueCents,
                              nextAction: lead.nextAction,
                              notes: lead.notes,
                            }}
                          />
                          <DeleteButton endpoint={`/api/tools/leads/${lead.id}`} label="Remove" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })
        )}

        <Card>
          <CardHeader>
            <CardTitle>Add a Lead</CardTitle>
          </CardHeader>
          <CreateLeadForm businessId={businessId} />
        </Card>
      </div>
    </div>
  );
}
