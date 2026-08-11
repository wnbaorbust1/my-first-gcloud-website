import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { ADMIN_ROLES } from "@/lib/rbac";
import { assertOrganizationAccess } from "@/lib/organizations/access";
import { COHORT_STATUS_LABELS, ORGANIZATION_TYPE_LABELS } from "@/lib/organizations/meta";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

import { AddMemberForm } from "./add-member-form";
import { CreateCohortForm } from "./create-cohort-form";
import { EditOrganizationForm } from "./edit-org-form";
import { SponsorForm } from "./sponsor-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const org = await prisma.organization.findUnique({ where: { id }, select: { name: true } });
  return { title: org ? `${org.name} — Blueprint` : "Organization — Blueprint" };
}

export default async function OrganizationDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: organizationId } = await params;
  const user = await requireUser(`/organization/${organizationId}`);

  const allowed = await assertOrganizationAccess(user.id, user.role, organizationId);
  if (!allowed) notFound();

  const [organization, isOrgAdminMembership] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        cohorts: { orderBy: { createdAt: "desc" }, include: { _count: { select: { memberships: true } } } },
        members: { include: { user: true }, orderBy: { createdAt: "asc" } },
        sponsoredMemberships: { include: { business: true } },
        sessions: { orderBy: { startsAt: "desc" }, take: 5 },
      },
    }),
    prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      select: { role: true },
    }),
  ]);
  if (!organization) notFound();

  const isAdmin = ADMIN_ROLES.includes(user.role) || isOrgAdminMembership?.role === "ADMIN";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {organization.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- external logo URL, no next/image domain config for arbitrary org logos yet.
            <img
              src={organization.logoUrl}
              alt=""
              className="h-14 w-14 rounded-xl border border-navy-100 object-contain"
            />
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy-900">{organization.name}</h1>
            <p className="text-sm text-foreground-muted">
              {organization.type ? ORGANIZATION_TYPE_LABELS[organization.type] : "Uncategorized"} · {organization.status}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/organization/${organization.id}/analytics`}
            className="rounded-xl border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
          >
            Analytics
          </Link>
          <Link
            href={`/organization/${organization.id}/impact-report`}
            className="rounded-xl border border-navy-200 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50"
          >
            Impact Report
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard label="Cohorts" value={organization.cohorts.length} />
        <MetricCard label="Staff" value={organization.members.length} />
        <MetricCard label="Sponsored seats" value={organization.sponsoredMemberships.length} />
        <MetricCard label="Training sessions" value={organization.sessions.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cohorts</CardTitle>
        </CardHeader>
        {organization.cohorts.length === 0 ? (
          <EmptyState
            title="No cohorts yet"
            description="Group participants into a cohort — a training group, a program year, a regional chapter."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {organization.cohorts.map((cohort) => (
              <Link key={cohort.id} href={`/organization/${organization.id}/cohorts/${cohort.id}`}>
                <div className="flex items-center justify-between rounded-xl border border-navy-100 p-4 transition-colors hover:border-navy-300">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{cohort.name}</p>
                    <p className="text-xs text-foreground-muted">
                      {cohort._count.memberships} participant{cohort._count.memberships === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="rounded-full border border-navy-200 px-3 py-1 text-xs font-medium text-navy-600">
                    {COHORT_STATUS_LABELS[cohort.status] ?? cohort.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 border-t border-navy-100 pt-4">
            <CreateCohortForm organizationId={organization.id} />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sponsored Access</CardTitle>
        </CardHeader>
        {organization.sponsoredMemberships.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            No businesses have sponsored Blueprint access from this organization yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {organization.sponsoredMemberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-navy-100 p-3">
                <p className="text-sm font-medium text-navy-900">{m.business.name}</p>
                <p className="text-xs text-foreground-muted">
                  {m.sponsoredUntil ? `Sponsored through ${m.sponsoredUntil.toLocaleDateString()}` : "Sponsored — no expiration"}
                </p>
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <div className="mt-4 border-t border-navy-100 pt-4">
            <SponsorForm organizationId={organization.id} />
          </div>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
        </CardHeader>
        <div className="flex flex-col gap-2">
          {organization.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-xl border border-navy-100 p-3">
              <div>
                <p className="text-sm font-medium text-navy-900">
                  {m.user.firstName} {m.user.lastName}
                </p>
                <p className="text-xs text-foreground-muted">{m.user.email}</p>
              </div>
              <span className="rounded-full border border-navy-200 px-3 py-1 text-xs font-medium text-navy-600">
                {m.role}
              </span>
            </div>
          ))}
        </div>
        {isAdmin && (
          <div className="mt-4 border-t border-navy-100 pt-4">
            <AddMemberForm organizationId={organization.id} />
          </div>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Branding &amp; Privacy</CardTitle>
          </CardHeader>
          <EditOrganizationForm organization={organization} />
        </Card>
      )}
    </div>
  );
}
