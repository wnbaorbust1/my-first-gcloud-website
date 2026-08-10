import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { ADMIN_ROLES } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const updateSchema = z.object({
  role: z.enum(["MEMBER", "FACILITATOR", "IMPLEMENTATION_SPECIALIST", "ADMIN", "SUPER_ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

/**
 * ADMIN — manage a user's role/active status. Only SUPER_ADMIN may grant
 * ADMIN or SUPER_ADMIN itself (an ADMIN promoting someone to their own
 * level or above would be a privilege-escalation hole); a plain ADMIN can
 * still manage MEMBER/FACILITATOR/IMPLEMENTATION_SPECIALIST.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: targetUserId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = updateSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (
    input.role &&
    ADMIN_ROLES.includes(input.role) &&
    user.role !== "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "Only a Super Admin can grant Admin or Super Admin." },
      { status: 403 },
    );
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (target.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: input,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "admin.user.update",
      entityType: "User",
      entityId: targetUserId,
      metadata: input,
    },
  });

  return NextResponse.json({
    user: { id: updated.id, role: updated.role, isActive: updated.isActive },
  });
}
