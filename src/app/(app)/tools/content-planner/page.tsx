import { CalendarClock, Lock } from "lucide-react";
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
import { CONTENT_CADENCE_LABELS } from "@/lib/tools/meta";
import type { ContentCadence } from "@/generated/prisma/enums";

import { ContentStatusControl } from "./content-status-control";
import { CreateContentForm } from "./create-content-form";

export const metadata: Metadata = { title: "Content Planner — Blueprint" };
export const dynamic = "force-dynamic";

const CADENCE_ORDER: ContentCadence[] = ["DAILY", "WEEKLY", "MONTHLY"];

const CONTENT_EDIT_FIELDS: EditField[] = [
  { key: "idea", label: "Idea", type: "textarea", rows: 2, maxLength: 2000, required: true },
  {
    key: "cadence",
    label: "Cadence",
    type: "select",
    options: CADENCE_ORDER.map((c) => ({ value: c, label: CONTENT_CADENCE_LABELS[c] })),
  },
  { key: "platform", label: "Platform", type: "text", maxLength: 100 },
  { key: "cta", label: "Call to Action", type: "text", maxLength: 200 },
  { key: "plannedDate", label: "Planned Date", type: "text", placeholder: "YYYY-MM-DD" },
];

export default async function ContentPlannerPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Content Planner unlocks after your Blueprint Session"
        description="Plan what you'll post once Builder access is unlocked."
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
  const items = await prisma.contentPlanItem.findMany({
    where: { businessId },
    orderBy: [{ plannedDate: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Content Planner</h1>
      <p className="mt-1 text-foreground-muted">
        Daily, weekly, and monthly content ideas for {ub!.business.name}.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {items.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Plan Your First Piece of Content" />
        ) : (
          CADENCE_ORDER.map((cadence) => {
            const cadenceItems = items.filter((i) => i.cadence === cadence);
            if (cadenceItems.length === 0) return null;
            return (
              <div key={cadence}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-navy-400">
                  {CONTENT_CADENCE_LABELS[cadence]}
                </p>
                <div className="flex flex-col gap-3">
                  {cadenceItems.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy-900">{item.idea}</p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                            {item.platform && <span>{item.platform}</span>}
                            {item.cta && <span>CTA: {item.cta}</span>}
                            {item.plannedDate && (
                              <span>
                                {item.plannedDate.toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <ContentStatusControl itemId={item.id} status={item.status} />
                          <EditToolModal
                            endpoint={`/api/tools/content/${item.id}`}
                            title="Edit Content Idea"
                            fields={CONTENT_EDIT_FIELDS}
                            initialValues={{
                              idea: item.idea,
                              cadence: item.cadence,
                              platform: item.platform,
                              cta: item.cta,
                              plannedDate: item.plannedDate
                                ? item.plannedDate.toISOString().slice(0, 10)
                                : "",
                            }}
                          />
                          <DeleteButton endpoint={`/api/tools/content/${item.id}`} label="Remove" />
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
            <CardTitle>Add a Content Idea</CardTitle>
          </CardHeader>
          <CreateContentForm businessId={businessId} />
        </Card>
      </div>
    </div>
  );
}
