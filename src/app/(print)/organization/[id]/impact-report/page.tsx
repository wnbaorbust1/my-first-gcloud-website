import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/shared/print-button";
import { formatCents } from "@/lib/money";
import { assertOrganizationAccess } from "@/lib/organizations/access";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/organizations/meta";
import { getOrganizationStats } from "@/lib/organizations/org-analytics";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id }, select: { name: true } });
  return { title: org ? `${org.name} Impact Report — Blueprint` : "Impact Report — Blueprint" };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-navy-100 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-navy-900">{value}</p>
    </div>
  );
}

/**
 * IMPACT REPORT (spec Prompt 12): "Printable/exportable" — reuses the
 * (print) route group (Phase 6) so it renders outside the app shell with
 * `window.print()` as the download path, same as the Blueprint Scorecard.
 * Every number is the same live query the Analytics page uses (see
 * src/lib/organizations/org-analytics.ts) — nothing here is authored or
 * cached. "Participant Confidence" has no real signal anywhere in this
 * schema, so it's shown honestly as "Not tracked" rather than guessed —
 * the same convention the Funnel used for "Session Viewed" in Phase 11.
 */
export default async function ImpactReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organizationId } = await params;
  const user = await requireUser(`/organization/${organizationId}/impact-report`);

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId);
  if (!allowed) notFound();

  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) notFound();

  const stats = await getOrganizationStats(organizationId);
  const trainingSessions = await prisma.sessionOffering.count({ where: { organizationId } });

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          href={`/organization/${organizationId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to organization
        </Link>
        <PrintButton />
      </div>

      <article className="print-page rounded-2xl border border-navy-100 bg-surface p-10 shadow-sm shadow-navy-900/5 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 border-b border-navy-100 pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">Impact Report</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-navy-900">{organization.name}</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            {organization.type ? ORGANIZATION_TYPE_LABELS[organization.type] : "Uncategorized"} · Generated{" "}
            {new Date().toLocaleDateString()}
          </p>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Participants Served" value={String(stats.participants)} />
          <Stat label="Training Sessions" value={String(trainingSessions)} />
          <Stat
            label="Assessment Improvement"
            value={stats.avgHealthImprovement !== null ? `${stats.avgHealthImprovement > 0 ? "+" : ""}${stats.avgHealthImprovement}%` : "Not enough data"}
          />
          <Stat label="Business Milestones" value={String(stats.milestonesAchieved)} />
          <Stat label="Businesses Launched" value={String(stats.businessesLaunched)} />
          <Stat label="Systems Built" value={String(stats.systemsBuilt)} />
          <Stat label="Jobs Created (self-reported)" value={String(stats.jobsCreated)} />
          <Stat
            label="Revenue Growth (self-reported)"
            value={stats.revenueGrowthCents !== null ? formatCents(stats.revenueGrowthCents) : "Not reported"}
          />
          <Stat label="Participant Confidence" value="Not tracked" />
        </section>

        <section className="mt-8 border-t border-navy-100 pt-6 text-xs text-foreground-muted">
          <p>
            All figures reflect live Blueprint data for this organization&apos;s cohorts and sponsored
            participants as of the date above. &ldquo;Jobs Created&rdquo; and &ldquo;Revenue Growth&rdquo; are
            self-reported by participating businesses. &ldquo;Participant Confidence&rdquo; has no tracked
            signal in Blueprint yet.
          </p>
        </section>
      </article>
    </div>
  );
}
