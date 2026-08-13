import { NextResponse } from "next/server";

import { completeAssessment, getMissingRequiredQuestions } from "@/lib/assessment/session";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

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

  return NextResponse.json({ assessmentId });
}
