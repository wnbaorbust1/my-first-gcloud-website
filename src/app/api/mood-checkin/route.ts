import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { submitMoodCheckIn } from "@/lib/affirmations/mood";
import { moodCheckInSchema } from "@/lib/validations/affirmations";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

/** Self-serve mood check-in (spec §7) — persists the check-in and returns a real adaptive response, not a generic acknowledgment. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = moodCheckInSchema.parse(body);
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

  const response = await submitMoodCheckIn(input.businessId, input.mood, input.note);
  return NextResponse.json({ ok: true, response });
}
