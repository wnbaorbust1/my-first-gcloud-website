import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { ensureRoadmapGenerated } from "@/lib/roadmap/generate";
import { getCurrentUser } from "@/lib/session";

const unlockSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required.").max(2000),
});

/**
 * UNLOCK THE FULL VISION BOARD (Phase 7: Admin and Facilitator Controls)
 * — an explicit admin override of the normal "attended AND paid a
 * qualifying session" gate (src/lib/sessions/qualification.ts). Kept
 * ADMIN-only (`can.unlockVisionBoard`), same level as granting
 * membership, since bypassing that gate is a bigger override than a
 * facilitator's usual notes/recommendations/attendance actions.
 *
 * A real, working unlock, not a half-measure: flipping
 * `builderAccessEligible` alone would leave the business's own
 * `resolveBlueprintAccess` reading "expired" (full access needs a
 * membership that currently grants it too — see
 * src/lib/blueprint/access.ts) — so this only touches Membership when
 * the business doesn't already have one that grants access, never
 * downgrading a real paid/trial membership that's already working.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { businessId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.unlockVisionBoard(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, builderAccessEligible: true, sessionCompletedAt: true, visionBoardUnlockedAt: true },
  });
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = unlockSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const now = new Date();

  await prisma.business.update({
    where: { id: businessId },
    data: {
      builderAccessEligible: true,
      sessionCompletedAt: business.sessionCompletedAt ?? now,
      visionBoardUnlockedAt: business.visionBoardUnlockedAt ?? now,
    },
  });

  const existingMembership = await getSyncedMembership(businessId);
  const alreadyGrantsAccess = !getBuilderAccessState(true, existingMembership).locked;

  let membership = existingMembership;
  if (!alreadyGrantsAccess) {
    membership = await prisma.membership.upsert({
      where: { businessId },
      create: {
        businessId,
        status: "ADMIN_GRANTED",
        grantedByUserId: user.id,
        grantedReason: input.reason,
      },
      update: {
        status: "ADMIN_GRANTED",
        grantedByUserId: user.id,
        grantedReason: input.reason,
      },
    });
  }

  await ensureRoadmapGenerated(businessId);

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "vision_board_unlocked",
      entityType: "Business",
      entityId: businessId,
      metadata: { reason: input.reason, membershipTouched: !alreadyGrantsAccess },
    },
  });

  return NextResponse.json({ ok: true, membership });
}
