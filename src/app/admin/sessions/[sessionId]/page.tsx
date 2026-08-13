import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";

import { RegistrantManager } from "./registrant-manager";
import { SessionEditForm } from "./session-edit-form";

export const metadata: Metadata = { title: "Edit Session — Blueprint Admin" };
export const dynamic = "force-dynamic";

/**
 * SESSION DETAIL / EDIT (Phase 7 continued) — full-field editing for a
 * single session, plus manually adding or removing clients from its
 * roster. Linked from the sessions list.
 */
export default async function AdminSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const [session, facilitators, organizations, programs, registrations] = await Promise.all([
    prisma.sessionOffering.findUnique({ where: { id: sessionId } }),
    prisma.user.findMany({
      where: { role: { in: STAFF_ROLES } },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.program.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.sessionRegistration.findMany({
      where: { sessionId, status: { not: "CANCELLED" } },
      orderBy: [{ status: "asc" }, { waitlistPosition: "asc" }],
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        business: { select: { name: true } },
      },
    }),
  ]);

  if (!session) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/sessions" className="text-sm font-medium text-navy-600 hover:underline">
          ← All Sessions
        </Link>
        <h1 className="font-display text-2xl font-semibold text-navy-900">{session.title}</h1>
        <p className="text-sm text-foreground-muted">
          {registrations.length} active registrant{registrations.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
        </CardHeader>
        <SessionEditForm
          session={{
            id: session.id,
            title: session.title,
            sessionType: session.sessionType,
            description: session.description,
            status: session.status,
            format: session.format,
            startsAt: session.startsAt.toISOString(),
            endsAt: session.endsAt ? session.endsAt.toISOString() : null,
            location: session.location,
            virtualLink: session.virtualLink,
            priceCents: session.priceCents,
            capacity: session.capacity,
            facilitatorId: session.facilitatorId,
            programId: session.programId,
            organizationId: session.organizationId,
          }}
          facilitators={facilitators.map((f) => ({ id: f.id, name: `${f.firstName} ${f.lastName}` }))}
          organizations={organizations}
          programs={programs}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrants</CardTitle>
        </CardHeader>
        <RegistrantManager sessionId={session.id} registrants={registrations} />
      </Card>
    </div>
  );
}
