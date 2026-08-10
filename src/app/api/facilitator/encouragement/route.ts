import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { hasAnyRole, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const encouragementSchema = z.object({
  businessId: z.string().min(1),
  message: z.string().trim().min(1, "Write a message first").max(2000),
});

/**
 * FACILITATOR ACTIONS (spec Prompt 11): "Send Encouragement." Writes a
 * real `Notification` row (Phase 1 model, never wired to anything until
 * now) for every member of the business — surfaced on their Dashboard
 * (see NotificationsCard) — rather than a note only staff can see, since
 * the whole point of encouragement is that the member reads it.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasAnyRole(user.role, STAFF_ROLES)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = encouragementSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized for this business" }, { status: 403 });
  }

  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    select: { name: true, memberships: { select: { userId: true } } },
  });
  if (!business) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.notification.createMany({
    data: business.memberships.map((m) => ({
      userId: m.userId,
      title: `A note of encouragement from ${user.firstName}`,
      body: input.message,
    })),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
