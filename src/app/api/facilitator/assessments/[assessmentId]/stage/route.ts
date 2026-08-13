import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const correctStageSchema = z.object({
  recommendedSessionType: z.enum(["PASSION", "POWER", "LEGACY", "GROWTH"]),
  note: z.string().trim().max(2000).optional(),
});

/**
 * CORRECT STAGE ASSIGNMENT (Phase 7: Admin and Facilitator Controls) —
 * lets a facilitator override the scoring engine's own
 * `recommendedSessionType` when their real-world read of the member
 * (from running the actual session) differs from what the raw answers
 * alone produced. Never silently replaces the engine's own computation:
 * `systemRecommendedSessionType` (set once, at completion, in
 * src/lib/assessment/session.ts) is never touched here, so "what did the
 * algorithm actually say" stays honestly recoverable. The correction
 * itself is also written to AuditLog with the before/after values, on
 * top of the live provenance fields on the row — the same
 * "who + why, not just that it happened" pattern as membership grants.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  const { assessmentId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.correctStageAssignment(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, businessId: true, recommendedSessionType: true },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, assessment.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized for this business" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = correctStageSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const previousType = assessment.recommendedSessionType;

  const updated = await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      recommendedSessionType: input.recommendedSessionType,
      stageOverriddenByUserId: user.id,
      stageOverriddenAt: new Date(),
      stageOverrideNote: input.note ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "assessment_stage_corrected",
      entityType: "Assessment",
      entityId: assessmentId,
      metadata: {
        businessId: assessment.businessId,
        from: previousType,
        to: input.recommendedSessionType,
        note: input.note ?? null,
      },
    },
  });

  return NextResponse.json({ assessment: updated });
}
