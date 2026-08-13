import { Lock, MessageSquare } from "lucide-react";
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
import { SALES_SCRIPT_TYPE_LABELS, SALES_SCRIPT_TYPE_ORDER } from "@/lib/tools/meta";

import { CreateScriptForm } from "./create-script-form";

const SCRIPT_EDIT_FIELDS: EditField[] = [
  {
    key: "type",
    label: "Type",
    type: "select",
    options: SALES_SCRIPT_TYPE_ORDER.map((t) => ({ value: t, label: SALES_SCRIPT_TYPE_LABELS[t] })),
  },
  { key: "title", label: "Title", type: "text", required: true, maxLength: 200 },
  { key: "content", label: "Script", type: "textarea", rows: 8, maxLength: 10000, required: true },
];

export const metadata: Metadata = { title: "Sales Scripts — Blueprint" };
export const dynamic = "force-dynamic";

export default async function ScriptsPage() {
  const user = await requireUser();
  const { ub, access } = await getGatedBusinessContext(user.id);

  if (access.locked && access.reason === "not-unlocked") {
    return (
      <EmptyState
        icon={Lock}
        title="The Sales Script Builder unlocks after your Blueprint Session"
        description="Build and store the scripts you actually use once Builder access is unlocked."
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
  const scripts = await prisma.salesScript.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-semibold text-navy-900">Sales Scripts</h1>
      <p className="mt-1 text-foreground-muted">
        Start from a template, make it sound like you, and save it for {ub!.business.name}.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {scripts.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Save Your First Script" />
        ) : (
          scripts.map((script) => (
            <Card key={script.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-power-600">
                    {SALES_SCRIPT_TYPE_LABELS[script.type]}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-navy-900">{script.title}</p>
                  <p className="mt-2 line-clamp-4 whitespace-pre-line text-xs text-foreground-muted">
                    {script.content}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <EditToolModal
                    endpoint={`/api/tools/scripts/${script.id}`}
                    title="Edit Script"
                    fields={SCRIPT_EDIT_FIELDS}
                    initialValues={{
                      type: script.type,
                      title: script.title,
                      content: script.content,
                    }}
                  />
                  <DeleteButton endpoint={`/api/tools/scripts/${script.id}`} />
                </div>
              </div>
            </Card>
          ))
        )}

        <Card>
          <CardHeader>
            <CardTitle>Create a Script</CardTitle>
          </CardHeader>
          <CreateScriptForm businessId={businessId} />
        </Card>
      </div>
    </div>
  );
}
