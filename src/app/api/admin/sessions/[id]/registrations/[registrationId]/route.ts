import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { cancelRegistration } from "@/lib/sessions/qualification";
import { getCurrentUser } from "@/lib/session";

/**
 * MANUALLY REMOVE A CLIENT FROM A SESSION (Phase 7 continued) — reuses
 * `cancelRegistration`, which also promotes the next waitlisted
 * registrant into the freed seat, exactly as a real member cancellation
 * would.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; registrationId: string }> },
) {
  const { id: sessionId, registrationId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageSessionRegistrations(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const registration = await prisma.sessionRegistration.findUnique({ where: { id: registrationId } });
  if (!registration || registration.sessionId !== sessionId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await cancelRegistration(registrationId);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "session_registration_removed_by_admin",
      entityType: "SessionRegistration",
      entityId: registrationId,
      metadata: { sessionId, businessId: registration.businessId },
    },
  });

  return NextResponse.json({ ok: true });
}
