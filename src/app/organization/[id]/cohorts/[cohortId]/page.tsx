import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/tools/delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { ADMIN_ROLES } from "@/lib/rbac";
import { assertOrganizationAccess } from "@/lib/organizations/access";
import { getCohortStats } from "@/lib/organizations/cohort-analytics";
import { COHORT_STATUS_LABELS } from "@/lib/organizations/meta";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { AddParticipantForm } from "./add-participant-form";
import { EditCohortForm } from "./edit-cohort-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; cohortId: string }>;
}): Promise<Metadata> {
  const { cohortId } = await params;
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId }, select: { name: true } });
  return { title: cohort ? `${cohort.name} — Blueprint` : "Cohort — Blueprint" };
}

export default async function CohortDetailPage({
  params,
}: {
  params: Promise<{ id: string; cohortId: string }>;
}) {
  const { id: organizationId, cohortId } = await params;
  const user = await requireUser(`/organization/${organizationId}/cohorts/${cohortId}`);

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId);
  if (!allowed) notFound();

  const [cohort, isOrgAdminMembership] = await Promise.all([
    prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        memberships: {
          include: { business: { include: { memberships: { include: { user: true }, take: 1, orderBy: { createdAt: "asc" } } } } },
          orderBy: { joinedAt: "desc" },
        },
      },
    }),
    prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      select: { role: true },
    }),
  ]);
  if (!cohort || cohort.organizationId !== organizationId) notFound();

  const isAdmin = ADMIN_ROLES.includes(user.role) || isOrgAdminMembership?.role === "ADMIN";
  const stats = await getCohortStats(cohortId);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/organization/${organizationId}`} className="text-sm font-medium text-navy-500 hover:text-navy-800">
          ← Back to organization
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy-900">{cohort.name}</h1>
            <p className="text-sm text-foreground-muted">
              {COHORT_STATUS_LABELS[cohort.status] ?? cohort.status}
              {cohort.startDate ? ` · Starts ${cohort.startDate.toLocaleDateString()}` : ""}
              {cohort.endDate ? ` · Ends ${cohort.endDate.toLocaleDateString()}` : ""}
            </p>
          </div>
        </div>
        {cohort.description && <p className="mt-3 max-w-2xl text-sm text-navy-700">{cohort.description}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Participants" value={stats.participants} />
        <MetricCard label="Sessions attended" value={stats.sessionsAttended} />
        <MetricCard
          label="Roadmap completion"
          value={stats.avgRoadmapCompletionPercent !== null ? `${stats.avgRoadmapCompletionPercent}%` : "—"}
        />
        <MetricCard label="Business health" value={stats.avgHealthPercent !== null ? `${stats.avgHealthPercent}%` : "—"} />
        <MetricCard label="Active (14 days)" value={stats.activeLast14DaysCount} />
        <MetricCard label="Milestones" value={stats.milestonesAchieved} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
        </CardHeader>
        {cohort.memberships.length === 0 ? (
          <EmptyState title="No participants yet" description="Add the first participant by email below." />
        ) : (
          <div className="flex flex-col gap-2">
            {cohort.memberships.map((m) => {
              const owner = m.business.memberships[0]?.user;
              return (
                <div key={m.id} className="flex items-center justify-between rounded-xl border border-navy-100 p-3">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{m.business.name}</p>
                    <p className="text-xs text-foreground-muted">
                      {owner ? `${owner.firstName} ${owner.lastName} · ${owner.email}` : "No owner on record"}
                    </p>
                  </div>
                  {isAdmin && (
                    <DeleteButton
                      endpoint={`/api/organizations/${organizationId}/cohorts/${cohortId}/members/${m.businessId}`}
                      confirmText="Remove this participant from the cohort?"
                      label="Remove"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 border-t border-navy-100 pt-4">
            <AddParticipantForm organizationId={organizationId} cohortId={cohortId} />
          </div>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Cohort Settings</CardTitle>
          </CardHeader>
          <EditCohortForm
            organizationId={organizationId}
            cohortId={cohortId}
            initialDescription={cohort.description ?? ""}
            initialStatus={cohort.status}
          />
        </Card>
      )}
    </div>
  );
}
