import { ArrowLeft, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, requireRole } from "@/lib/session";

export const metadata: Metadata = { title: "Vision Board Version History — Blueprint Facilitator" };
export const dynamic = "force-dynamic";

/**
 * REVIEW PREVIOUS BOARD VERSIONS (Phase 7: Admin and Facilitator
 * Controls) — real, explicit checkpoints a member saved (Phase 6:
 * Downloads' "Save New Version"), listed newest-first.
 */
export default async function VisionBoardVersionsPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const user = await requireRole(STAFF_ROLES, "/facilitator/participants");

  const allowed = await assertBusinessAccess(user.id, user.role, businessId);
  if (!allowed) notFound();

  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { name: true } });
  if (!business) notFound();

  const versions = await prisma.visionBoardVersion.findMany({
    where: { businessId },
    orderBy: { version: "desc" },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/facilitator/participants/${businessId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500 hover:text-navy-800"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to {business.name}
      </Link>

      <h1 className="mt-2 font-display text-2xl font-semibold text-navy-900">
        {business.name}&apos;s Vision Board Version History
      </h1>
      <p className="mt-1 text-sm text-foreground-muted">
        Every version below is a real, complete snapshot of the board on the day it was saved.
      </p>

      {versions.length === 0 ? (
        <EmptyState
          icon={History}
          title="No saved versions yet"
          description="A member saves a version from the Downloads toolbar on their Vision Board."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {versions.map((v) => (
            <Card key={v.id}>
              <CardHeader>
                <CardTitle>Version {v.version}</CardTitle>
              </CardHeader>
              <p className="text-sm text-foreground-muted">
                Saved {v.createdAt.toLocaleString()}
                {v.createdBy ? ` by ${v.createdBy.firstName} ${v.createdBy.lastName}` : ""}
              </p>
              <Link
                href={`/facilitator/participants/${businessId}/vision-board/versions/${v.id}`}
                className="mt-2 inline-block text-sm font-medium text-navy-500 underline hover:text-navy-800"
              >
                Review this version
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
