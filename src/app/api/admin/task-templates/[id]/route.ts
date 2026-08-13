import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const updateSchema = z.object({
  isActive: z.boolean().optional(),
  whyItMatters: z.string().trim().min(1).max(2000).optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  impact: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  priority: z.enum(["MUST_DO", "SHOULD_DO", "BONUS"]).optional(),
});

/**
 * CONTENT MANAGEMENT (spec Prompt 11): "Admin should manage: Task
 * Templates, Roadmap Templates." A business's initial roadmap is
 * generated directly from this 30-task library (Phase 5) — there is no
 * separate "Roadmap Template" model to edit; editing a TaskTemplate here
 * is editing the roadmap template.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageContent(user.role)) {
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

  const template = await prisma.taskTemplate.findUnique({ where: { id: templateId } });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.taskTemplate.update({ where: { id: templateId }, data: input });

  return NextResponse.json({ template: updated });
}
