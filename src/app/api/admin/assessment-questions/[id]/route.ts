import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const updateSchema = z.object({
  prompt: z.string().trim().min(1).max(500).optional(),
  helperText: z.string().trim().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  weight: z.number().positive().optional(),
  includeInScoring: z.boolean().optional(),
});

/** CONTENT MANAGEMENT (spec Prompt 11): "Admin should manage: Assessment Questions." */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: questionId } = await params;

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

  const question = await prisma.assessmentQuestion.findUnique({ where: { id: questionId } });
  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.assessmentQuestion.update({ where: { id: questionId }, data: input });

  return NextResponse.json({ question: updated });
}
