import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ensureRoadmapGenerated } from "@/lib/roadmap/generate";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, requireRole } from "@/lib/session";
import type { Stage } from "@/lib/utils";

import { AddTaskForms } from "./add-task-forms";
import { RoadmapControls } from "./roadmap-controls";

export const metadata: Metadata = { title: "Manage Roadmap — Blueprint Facilitator" };
export const dynamic = "force-dynamic";

export default async function ManageRoadmapPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const user = await requireRole(STAFF_ROLES, "/facilitator/participants");

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) notFound();

  const allowed = await assertBusinessAccess(user.id, user.role, businessId);
  if (!allowed) notFound();

  // Self-healing (pre-publish audit follow-up): a business can end up
  // builderAccessEligible with no Roadmap row if access was granted a
  // way other than the normal attend-a-qualifying-session path (e.g.
  // an admin's "Unlock Full Vision Board" override that ran before this
  // page existed, or a direct database fix) — ensureRoadmapGenerated is
  // idempotent (no-ops instantly if a roadmap already exists), so it's
  // safe to call unconditionally on every load rather than leaving this
  // page permanently stuck on "one is created automatically" for a
  // business that will never trigger that automatic path.
  if (business.builderAccessEligible) {
    await ensureRoadmapGenerated(businessId);
  }

  const roadmap = await prisma.roadmap.findFirst({
    where: { businessId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  const assignedTemplateIds = new Set(
    (roadmap?.tasks ?? []).map((t) => t.taskTemplateId).filter(Boolean) as string[],
  );
  const allTemplates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ stage: "asc" }, { order: "asc" }],
    select: { id: true, title: true, stage: true },
  });
  const availableTemplates = allTemplates.filter((t) => !assignedTemplateIds.has(t.id));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/facilitator/participants"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to participants
      </Link>

      <h1 className="mt-4 font-display text-2xl font-semibold text-navy-900">
        Manage Roadmap — {business.name}
      </h1>
      <p className="text-sm text-foreground-muted">
        Assign, reorder, reprioritize, pause, unlock, or remove tasks on this business&apos;s roadmap.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Add a Task</CardTitle>
        </CardHeader>
        {roadmap ? (
          <AddTaskForms businessId={businessId} availableTemplates={availableTemplates} />
        ) : (
          <p className="text-sm text-foreground-muted">
            This business doesn&apos;t have a roadmap yet — one is created automatically once their
            qualifying session is marked attended.
          </p>
        )}
      </Card>

      <div className="mt-6">
        {roadmap && roadmap.tasks.length > 0 ? (
          <RoadmapControls
            tasks={roadmap.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              stage: t.stage as Stage,
              category: t.category,
              status: t.status,
              priority: t.priority,
              facilitatorAdjusted: t.facilitatorAdjusted,
            }))}
          />
        ) : (
          <EmptyState title="No roadmap tasks yet" description="Assign a task above to get started." />
        )}
      </div>
    </div>
  );
}
