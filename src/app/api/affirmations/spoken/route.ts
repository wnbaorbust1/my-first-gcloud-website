import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { markSpoken } from "@/lib/affirmations/affirmations";
import { affirmationActionSchema } from "@/lib/validations/affirmations";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

/** "I Spoke This Today" (spec §7) — 2 points, once per business per affirmation per day. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = affirmationActionSchema.parse(body);
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

  const created = await markSpoken(input.businessId, input.affirmationId);
  return NextResponse.json({ ok: true, alreadyLoggedToday: !created });
}
