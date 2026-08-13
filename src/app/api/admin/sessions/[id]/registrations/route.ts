import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { registerForSession } from "@/lib/sessions/qualification";
import { getCurrentUser } from "@/lib/session";

const addSchema = z.object({
  ownerEmail: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

/**
 * MANUALLY ADD A CLIENT TO A SESSION (Phase 7 continued) — an
 * admin-authorized wrapper around the same `registerForSession` used by
 * the real member-facing registration flow (same capacity/waitlist
 * logic, same serializable-transaction race protection), so an admin
 * add behaves exactly like a real signup rather than a parallel,
 * capacity-blind code path. Takes the business owner's account email —
 * the same lookup convention as /api/admin/facilitator-assignments —
 * since that's what an admin actually has on hand, not an internal id.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageSessionRegistrations(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = addSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const session = await prisma.sessionOffering.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const owner = await prisma.user.findUnique({
    where: { email: input.ownerEmail },
    include: { businessMemberships: { orderBy: { createdAt: "asc" }, take: 1, include: { business: true } } },
  });
  const business = owner?.businessMemberships[0]?.business;
  if (!owner || !business) {
    return NextResponse.json({ error: "No business found for that email" }, { status: 404 });
  }

  const registration = await registerForSession({
    userId: owner.id,
    businessId: business.id,
    sessionId,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "session_registration_added_by_admin",
      entityType: "SessionRegistration",
      entityId: registration.id,
      metadata: { sessionId, businessId: business.id },
    },
  });

  return NextResponse.json({ registration }, { status: 201 });
}
