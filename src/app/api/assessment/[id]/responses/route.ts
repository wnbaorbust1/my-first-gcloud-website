import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { responseValueSchema, saveResponseSchema } from "@/lib/validations/assessment";

/**
 * Autosave endpoint — the assessment UI calls this on every answer, not
 * only on an explicit "Save" click (spec: "Autosave"). Upserts one
 * AssessmentResponse and flips the assessment into IN_PROGRESS on the
 * first answer.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: assessmentId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, businessId: true, status: true, startedAt: true },
  });
  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, assessment.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (assessment.status === "COMPLETED") {
    return NextResponse.json(
      { error: "This assessment is already complete." },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = saveResponseSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const question = await prisma.assessmentQuestion.findUnique({
    where: { id: input.questionId },
  });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  let value;
  try {
    value = responseValueSchema(question).parse(input.value);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid answer" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.assessmentResponse.upsert({
      where: {
        assessmentId_questionId: { assessmentId, questionId: input.questionId },
      },
      create: { assessmentId, questionId: input.questionId, value: value as never },
      update: { value: value as never },
    }),
    prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        status: "IN_PROGRESS",
        startedAt: assessment.startedAt ?? new Date(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
