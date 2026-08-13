import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ORGANIZATION_TYPE_LABELS } from "@/lib/organizations/meta";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ADMIN_ROLES } from "@/lib/rbac";

export const metadata: Metadata = { title: "My Organizations — Blueprint" };
export const dynamic = "force-dynamic";

/** Landing page: the organizations this user actually belongs to (or, for a platform admin, every organization). */
export default async function OrganizationLandingPage() {
  const user = await requireUser("/organization");
  const isPlatformAdmin = ADMIN_ROLES.includes(user.role);

  const organizations = isPlatformAdmin
    ? await prisma.organization.findMany({ orderBy: { name: "asc" } })
    : await prisma.organization.findMany({
        where: { members: { some: { userId: user.id } } },
        orderBy: { name: "asc" },
      });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Organizations</h1>
        <p className="text-sm text-foreground-muted">
          {isPlatformAdmin
            ? "Every organization on the platform."
            : "The organizations you're a staff member of."}
        </p>
      </div>

      {organizations.length === 0 ? (
        <EmptyState
          title="No organizations yet"
          description={
            isPlatformAdmin
              ? "Create one from the Admin area."
              : "You're not part of any organization yet. Ask a platform admin to add you."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {organizations.map((org) => (
            <Link key={org.id} href={`/organization/${org.id}`}>
              <Card className="p-4 transition-colors hover:border-navy-300">
                <p className="text-sm font-semibold text-navy-900">{org.name}</p>
                <p className="text-xs text-foreground-muted">
                  {org.type ? ORGANIZATION_TYPE_LABELS[org.type] : "Uncategorized"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
