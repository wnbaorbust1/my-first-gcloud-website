import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { grantMembershipSchema } from "@/lib/validations/billing";

/**
 * spec Prompt 8 EXISTING MEMBER RULE: "Admin may manually grant
 * promotional credit later." SPONSORED / ADMIN_GRANTED are the only two
 * membership states that are never set automatically — always this one
 * explicit, provenance-tracked admin action (who + why, not just that it
 * happened). Works whether or not the business has a Membership row yet
 * (a business can be sponsored before ever attending a session).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;
  const user = await getCurrentUser();
  if (!user || !can.grantMembership(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = grantMembershipSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const membership = await prisma.membership.upsert({
    where: { businessId },
    create: {
      businessId,
      status: input.status,
      grantedByUserId: user.id,
      grantedReason: input.reason,
    },
    update: {
      status: input.status,
      grantedByUserId: user.id,
      grantedReason: input.reason,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "membership_granted",
      entityType: "Membership",
      entityId: membership.id,
      metadata: { businessId, status: input.status, reason: input.reason },
    },
  });

  return NextResponse.json({ membership });
}
