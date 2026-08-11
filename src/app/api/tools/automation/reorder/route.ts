import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { reorderSchema } from "@/lib/validations/tools";

/**
 * Atomically swaps two Automation steps' `order` values in a single
 * transaction — same fix as the Journey reorder endpoint, for the same
 * reason (the old `ReorderButtons` did two independent, non-atomic
 * PATCH calls). Both steps must belong to the same, caller-accessible
 * business.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = reorderSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const [a, b] = await Promise.all([
    prisma.automationStep.findUnique({ where: { id: input.aId } }),
    prisma.automationStep.findUnique({ where: { id: input.bId } }),
  ]);
  if (!a || !b || a.businessId !== b.businessId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, a.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updatedA, updatedB] = await prisma.$transaction([
    prisma.automationStep.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.automationStep.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  return NextResponse.json({ a: updatedA, b: updatedB });
}
