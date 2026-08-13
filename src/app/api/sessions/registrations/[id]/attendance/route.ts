import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { markAttendance } from "@/lib/sessions/qualification";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const attendanceSchema = z.object({
  status: z.enum(["ATTENDED", "NO_SHOW", "COMPLETED", "CANCELLED"]),
  notes: z.string().trim().max(2000).optional(),
});

/** Facilitator/admin only — marks attendance and, if qualifying, unlocks Builder. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: registrationId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasAnyRole(user.role, STAFF_ROLES)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const registration = await prisma.sessionRegistration.findUnique({
    where: { id: registrationId },
  });
  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }
  if (!registration.businessId) {
    return NextResponse.json(
      { error: "This registration has no associated business." },
      { status: 409 },
    );
  }

  const allowed = await assertBusinessAccess(user.id, user.role, registration.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = attendanceSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await markAttendance(registrationId, input.status, input.notes);
  return NextResponse.json({ ok: true });
}
