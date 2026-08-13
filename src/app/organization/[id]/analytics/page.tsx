import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { getParticipantSummaries } from "@/lib/facilitator/participants";
import { assertOrganizationAccess } from "@/lib/organizations/access";
import { getOrganizationBusinessIds, getOrganizationStats } from "@/lib/organizations/org-analytics";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { STAGE_META } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id }, select: { name: true } });
  return { title: org ? `${org.name} Analytics — Blueprint` : "Analytics — Blueprint" };
}

/**
 * ORGANIZATION ANALYTICS (spec Prompt 12): "Organizations should see
 * aggregate information by default. Only expose individual participant
 * information when permissions/program agreements allow it." Aggregate
 * numbers always render; the participant-by-participant table only
 * renders when `organization.allowIndividualParticipantData` is true.
 */
export default async function OrganizationAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organizationId } = await params;
  const user = await requireUser(`/organization/${organizationId}/analytics`);

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId);
  if (!allowed) notFound();

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) notFound();

  const stats = await getOrganizationStats(organizationId);

  const participants = organization.allowIndividualParticipantData
    ? await getParticipantSummaries(await getOrganizationBusinessIds(organizationId))
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href={`/organization/${organizationId}`} className="text-sm font-medium text-navy-500 hover:text-navy-800">
          ← Back to organization
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">{organization.name} Analytics</h1>
        <p className="text-sm text-foreground-muted">
          {organization.allowIndividualParticipantData
            ? "Aggregate and individual participant data — enabled for this organization."
            : "Aggregate data only. Individual participant records are hidden by default."}
        </p>
      </div>

      {stats.participants === 0 ? (
        <EmptyState
          title="No participants yet"
          description="Assign participants to a cohort or sponsor their access to see analytics here."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <MetricCard label="Participants" value={stats.participants} />
            <MetricCard label="Assessments completed" value={stats.assessmentCompletionCount} />
            <MetricCard label="Session attendance" value={stats.sessionAttendance} />
            <MetricCard
              label="Roadmap completion"
              value={stats.avgRoadmapCompletionPercent !== null ? `${stats.avgRoadmapCompletionPercent}%` : "—"}
            />
            <MetricCard label="Business health" value={stats.avgHealthPercent !== null ? `${stats.avgHealthPercent}%` : "—"} />
            <MetricCard
              label="Health improvement"
              value={stats.avgHealthImprovement !== null ? `${stats.avgHealthImprovement > 0 ? "+" : ""}${stats.avgHealthImprovement}%` : "Not enough data"}
              helpText="Avg. change between each business's two most recent completed assessments"
            />
            <MetricCard label="Businesses launched" value={stats.businessesLaunched} />
            <MetricCard label="Milestones achieved" value={stats.milestonesAchieved} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stage Averages</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {(["PASSION", "POWER", "LEGACY"] as const).map((stage) => (
                <div key={stage} className="rounded-xl border border-navy-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">
                    {STAGE_META[stage].label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-navy-900">
                    {stats.stageAverages[stage] !== null ? `${stats.stageAverages[stage]}%` : "—"}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {organization.allowIndividualParticipantData && (
            <Card>
              <CardHeader>
                <CardTitle>Participants</CardTitle>
              </CardHeader>
              {participants.length === 0 ? (
                <p className="text-sm text-foreground-muted">No participant records yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-navy-100 text-xs uppercase tracking-wide text-navy-400">
                        <th className="py-2 pr-4">Business</th>
                        <th className="py-2 pr-4">Owner</th>
                        <th className="py-2 pr-4">Health</th>
                        <th className="py-2 pr-4">Roadmap</th>
                        <th className="py-2 pr-4">Last active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p) => (
                        <tr key={p.businessId} className="border-b border-navy-50">
                          <td className="py-2 pr-4 font-medium text-navy-900">{p.businessName}</td>
                          <td className="py-2 pr-4 text-navy-600">{p.ownerName ?? "—"}</td>
                          <td className="py-2 pr-4 text-navy-600">{p.healthPercent !== null ? `${p.healthPercent}%` : "—"}</td>
                          <td className="py-2 pr-4 text-navy-600">
                            {p.roadmapCompletePercent !== null ? `${p.roadmapCompletePercent}%` : "—"}
                          </td>
                          <td className="py-2 pr-4 text-navy-600">
                            {p.lastActiveAt ? p.lastActiveAt.toLocaleDateString() : "Never"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
