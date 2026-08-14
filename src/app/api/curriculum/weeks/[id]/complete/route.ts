import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { completeWeek } from "@/lib/curriculum/curriculum";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { completeWeekSchema } from "@/lib/validations/curriculum";

/** Marks a curriculum week COMPLETED — requires all 5 daily actions logged and a real weekly-review answer. 50 points, idempotent. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: weekId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = completeWeekSchema.parse(body);
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

  const result = await completeWeek(input.businessId, weekId, input.reviewNote);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
