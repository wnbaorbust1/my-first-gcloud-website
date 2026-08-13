import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { hasAnyRole, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { createRoadmapTaskSchema } from "@/lib/validations/facilitator-roadmap";

/** Facilitator control: assign a library task, or add a fully custom one. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!hasAnyRole(user.role, STAFF_ROLES)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = createRoadmapTaskSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not authorized for this business" }, { status: 403 });
  }

  const roadmap = await prisma.roadmap.findFirst({ where: { businessId: input.businessId } });
  if (!roadmap) {
    return NextResponse.json(
      { error: "This business doesn't have a roadmap yet." },
      { status: 409 },
    );
  }

  const maxOrder = await prisma.roadmapTask.aggregate({
    where: { roadmapId: roadmap.id },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  if (input.mode === "assign") {
    const template = await prisma.taskTemplate.findUnique({
      where: { id: input.taskTemplateId },
      include: { prerequisites: { select: { title: true } } },
    });
    if (!template) {
      return NextResponse.json({ error: "Task template not found" }, { status: 404 });
    }
    const already = await prisma.roadmapTask.findFirst({
      where: { roadmapId: roadmap.id, taskTemplateId: template.id },
    });
    if (already) {
      return NextResponse.json({ error: "This task is already on the roadmap." }, { status: 409 });
    }

    const completedTitles = new Set(
      (
        await prisma.roadmapTask.findMany({
          where: { roadmapId: roadmap.id, status: "COMPLETED" },
          select: { title: true },
        })
      ).map((t) => t.title),
    );
    const prereqTitles = template.prerequisites.map((p) => p.title);
    const ready = prereqTitles.length === 0 || prereqTitles.every((t) => completedTitles.has(t));

    const task = await prisma.roadmapTask.create({
      data: {
        roadmapId: roadmap.id,
        taskTemplateId: template.id,
        stage: template.stage,
        category: template.category,
        title: template.title,
        description: template.whyItMatters,
        priority: template.priority,
        estimatedMins: template.estimatedMins,
        order: nextOrder,
        status: ready ? "NOT_STARTED" : "LOCKED",
        facilitatorAdjusted: true,
      },
    });
    return NextResponse.json({ task }, { status: 201 });
  }

  const task = await prisma.roadmapTask.create({
    data: {
      roadmapId: roadmap.id,
      stage: input.stage,
      category: input.category,
      title: input.title,
      description: input.description,
      priority: input.priority,
      estimatedMins: input.estimatedMins,
      order: nextOrder,
      status: "NOT_STARTED",
      facilitatorAdjusted: true,
    },
  });
  return NextResponse.json({ task }, { status: 201 });
}
