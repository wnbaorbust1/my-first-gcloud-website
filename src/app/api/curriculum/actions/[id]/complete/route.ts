import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { completeDailyAction } from "@/lib/curriculum/curriculum";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { completeDailyActionSchema } from "@/lib/validations/curriculum";

/** Marks one curriculum daily action done — 10 points, once per (business, action), idempotent. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: dailyActionId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = completeDailyActionSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, input.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const created = await completeDailyAction(input.businessId, dailyActionId, input.proofNote);
  return NextResponse.json({ ok: true, alreadyCompleted: !created });
}
