import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";

import { CreateSessionForm } from "./create-session-form";
import { FacilitatorAssignmentForm } from "./facilitator-assignment-form";
import { SessionStatusControl } from "./session-status-control";

export const metadata: Metadata = { title: "Manage Sessions — Blueprint Admin" };
export const dynamic = "force-dynamic";

export default async function AdminSessionsPage() {
  const [sessions, facilitators, organizations, assignments] = await Promise.all([
    prisma.sessionOffering.findMany({
      orderBy: { startsAt: "desc" },
      take: 100,
      include: {
        facilitator: { select: { firstName: true, lastName: true } },
        _count: { select: { registrations: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.facilitatorAssignment.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        facilitator: { select: { firstName: true, lastName: true, email: true } },
        business: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy-900">Sessions</h1>
        <p className="text-sm text-foreground-muted">
          {sessions.length} session offering{sessions.length === 1 ? "" : "s"}
        </p>
      </div>

      {sessions.length === 0 ? (
        <EmptyState title="No sessions yet" description="Create the first one below." />
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/admin/sessions/${s.id}`}
                    className="text-sm font-semibold text-navy-900 hover:underline"
                  >
                    {s.title}
                  </Link>
                  <p className="text-xs text-foreground-muted">
                    {s.sessionType} · {s.format} · {s.startsAt.toLocaleString()} ·{" "}
                    {s._count.registrations}
                    {s.capacity ? ` / ${s.capacity}` : ""} registered
                    {s.facilitator && ` · ${s.facilitator.firstName} ${s.facilitator.lastName}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/sessions/${s.id}`}
                    className="text-xs font-medium text-navy-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <SessionStatusControl sessionId={s.id} status={s.status} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create a Session</CardTitle>
        </CardHeader>
        <CreateSessionForm
          facilitators={facilitators.map((f) => ({ id: f.id, name: `${f.firstName} ${f.lastName}` }))}
          organizations={organizations}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facilitator Assignments</CardTitle>
        </CardHeader>
        <p className="mb-4 text-sm text-foreground-muted">
          Assign a facilitator to a business by the owner&apos;s account email — this is what a
          facilitator&apos;s participant list and attendance permissions are scoped to.
        </p>
        <FacilitatorAssignmentForm
          facilitators={facilitators.map((f) => ({ id: f.id, name: `${f.firstName} ${f.lastName}` }))}
          assignments={assignments}
        />
      </Card>
    </div>
  );
}
