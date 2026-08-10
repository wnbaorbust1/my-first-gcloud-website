import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const updateSchema = z.object({
  stageThresholds: z.object({
    PASSION: z.number().int().min(0).max(100),
    POWER: z.number().int().min(0).max(100),
    LEGACY: z.number().int().min(0).max(100),
  }),
  excellenceThreshold: z.number().int().min(0).max(100),
});

/**
 * CONTENT MANAGEMENT (spec Prompt 11): "Thresholds can be modified" —
 * the exact fields `AssessmentScoringConfig`'s own doc comments call out
 * as the configurable ones (stageThresholds drives the session
 * recommendation, excellenceThreshold drives the GROWTH-session
 * override). `stageWeights`/`statusBands` stay admin-visible but
 * read-only this phase — see BUILD_STATUS.md.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: configId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageAssessmentQuestions(user.role)) {
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

  const config = await prisma.assessmentScoringConfig.findUnique({ where: { id: configId } });
  if (!config) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.assessmentScoringConfig.update({
    where: { id: configId },
    data: {
      stageThresholds: input.stageThresholds,
      excellenceThreshold: input.excellenceThreshold,
    },
  });

  return NextResponse.json({ config: updated });
}
