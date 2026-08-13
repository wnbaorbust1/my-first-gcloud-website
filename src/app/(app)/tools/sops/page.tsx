import { ClipboardList, Lock } from "lucide-react";
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

import { CreateSopForm } from "./create-sop-form";

const SOP_EDIT_FIELDS: EditField[] = [
  { key: "name", label: "Name", type: "text", required: true, maxLength: 200 },
  { key: "purpose", label: "Purpose", type: "textarea", maxLength: 2000 },
  { key: "trigger", label: "Trigger", type: "textarea", rows: 2, maxLength: 1000 },
  { key: "owner", label: "Owner", type: "text", maxLength: 200 },
  { key: "tools", label: "Tools", type: "textarea", rows: 2, maxLength: 1000 },
  { key: "steps", label: "Steps", type: "textarea", rows: 6, maxLength: 8000 },
  { key: "completionCriteria", label: "Completion Criteria", type: "textarea", rows: 2, maxLength: 1000 },
  { key: "exceptions", label: "Exceptions", type: "textarea", rows: 2, maxLength: 1000 },
  { key: "reviewDate", label: "Review Date", type: "text", placeholder: "YYYY-MM-DD" },
];

export const metadata: Metadata = { title: "SOPs — Blueprint" };
export const dynamic = "force-dynamic";

export default async function SopsPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The SOP Builder unlocks after your Blueprint Session"
        description="Document how your business really runs once Builder access is unlocked."
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
  const sops = await prisma.sop.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">SOP Builder</h1>
      <p className="mt-1 text-foreground-muted">
        Turn how {ub!.business.name} actually runs into repeatable, documented processes.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {sops.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Document Your First SOP"
            description="Even one written-down process makes your business less dependent on you remembering everything."
          />
        ) : (
          sops.map((sop) => (
            <Card key={sop.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{sop.name}</p>
                  {sop.owner && (
                    <p className="mt-0.5 text-xs text-foreground-muted">Owner: {sop.owner}</p>
                  )}
                  {sop.purpose && <p className="mt-1.5 text-sm text-foreground-muted">{sop.purpose}</p>}
                  {sop.steps && (
                    <div className="mt-2 whitespace-pre-line rounded-xl bg-navy-50 p-3 text-xs text-navy-700">
                      {sop.steps}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-muted">
                    {sop.trigger && <span>Trigger: {sop.trigger}</span>}
                    {sop.tools && <span>Tools: {sop.tools}</span>}
                    {sop.reviewDate && (
                      <span>
                        Review by{" "}
                        {sop.reviewDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <EditToolModal
                    endpoint={`/api/tools/sops/${sop.id}`}
                    title="Edit SOP"
                    fields={SOP_EDIT_FIELDS}
                    initialValues={{
                      name: sop.name,
                      purpose: sop.purpose,
                      trigger: sop.trigger,
                      owner: sop.owner,
                      tools: sop.tools,
                      steps: sop.steps,
                      completionCriteria: sop.completionCriteria,
                      exceptions: sop.exceptions,
                      reviewDate: sop.reviewDate ? sop.reviewDate.toISOString().slice(0, 10) : "",
                    }}
                  />
                  <DeleteButton endpoint={`/api/tools/sops/${sop.id}`} />
                </div>
              </div>
            </Card>
          ))
        )}

        <Card>
          <CardHeader>
            <CardTitle>{sops.length === 0 ? "Create Your First SOP" : "Add Another SOP"}</CardTitle>
          </CardHeader>
          <CreateSopForm businessId={businessId} />
        </Card>
      </div>
    </div>
  );
}
