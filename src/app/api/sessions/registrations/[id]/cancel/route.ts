import { NextResponse } from "next/server";

import { cancelRegistration } from "@/lib/sessions/qualification";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: registrationId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const registration = await prisma.sessionRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  const isOwner = registration.userId === user.id;
  const isStaff = hasAnyRole(user.role, STAFF_ROLES);
  const staffAllowed =
    isStaff && registration.businessId
      ? await assertBusinessAccess(user.id, user.role, registration.businessId)
      : false;

  if (!isOwner && !staffAllowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await cancelRegistration(registrationId);
  return NextResponse.json({ ok: true });
}
