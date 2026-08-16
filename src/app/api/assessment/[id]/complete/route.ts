import { NextResponse } from "next/server";

import { completeAssessment, getMissingRequiredQuestions } from "@/lib/assessment/session";
import { notifyGhl } from "@/lib/integrations/ghl";
import { prisma } from "@/lib/prisma";
import { getLowestScoringStage } from "@/lib/roadmap/next-best-action";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import type { Stage } from "@/lib/utils";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: assessmentId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, businessId: true, status: true },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, assessment.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (assessment.status === "COMPLETED") {
    return NextResponse.json({ assessmentId });
  }

  const missing = await getMissingRequiredQuestions(assessmentId);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: "Please answer every question before viewing your results.",
        missingCount: missing.length,
      },
      { status: 400 },
    );
  }

  await completeAssessment(assessmentId);

  // GHL LEAD WORKFLOW — fires exactly once, since the early return above
  // means this line is only ever reached the first time an assessment
  // transitions into COMPLETED. Fault-isolated by notifyGhl itself.
  const [business, scores, scoredAssessment] = await Promise.all([
    prisma.business.findUnique({ where: { id: assessment.businessId }, select: { name: true } }),
    prisma.assessmentScore.findMany({
      where: { assessmentId },
      select: { stage: true, scorePercent: true },
    }),
    prisma.assessment.findUnique({ where: { id: assessmentId }, select: { healthScorePercent: true } }),
  ]);
  const lowestScoringStage = getLowestScoringStage(
    scores.map((s) => ({ stage: s.stage as Stage, scorePercent: s.scorePercent })),
  );
  // user.email is optional on the session type (NextAuth default), even
  // though every real sign-in path here sets it — skip rather than send
  // GHL a lead with no address in the one case it's somehow missing.
  if (user.email) {
    await notifyGhl({
      event: "assessment_completed",
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      businessName: business?.name ?? null,
      stage: lowestScoringStage,
      healthScorePercent: scoredAssessment?.healthScorePercent ?? null,
    });
  }

  return NextResponse.json({ assessmentId });
}
