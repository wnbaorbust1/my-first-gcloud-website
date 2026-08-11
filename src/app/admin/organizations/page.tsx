import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/organizations/meta";

import { CreateOrganizationForm } from "./create-organization-form";

export const metadata: Metadata = { title: "Organizations — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminOrganizationsPage() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { cohorts: true, members: true, sponsoredMemberships: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Organizations</h1>
        <p className="text-sm text-foreground-muted">
          {organizations.length} organization{organizations.length === 1 ? "" : "s"}
        </p>
      </div>

      {organizations.length === 0 ? (
        <EmptyState title="No organizations yet" description="Create the first one below." />
      ) : (
        <div className="flex flex-col gap-2">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organization/${org.id}`}>
              <Card className="p-4 transition-colors hover:border-navy-300">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{org.name}</p>
                    <p className="text-xs text-foreground-muted">
                      {org.type ? ORGANIZATION_TYPE_LABELS[org.type] : "Uncategorized"} ·{" "}
                      {org._count.cohorts} cohort{org._count.cohorts === 1 ? "" : "s"} ·{" "}
                      {org._count.members} staff · {org._count.sponsoredMemberships} sponsored
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create an Organization</CardTitle>
        </CardHeader>
        <CreateOrganizationForm />
      </Card>
    </div>
  );
}
