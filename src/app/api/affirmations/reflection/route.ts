import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { addReflection } from "@/lib/affirmations/affirmations";
import { reflectionSchema } from "@/lib/validations/affirmations";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

/** "Complete a reflection" (spec §7) — 5 points, once per business per affirmation per day. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = reflectionSchema.parse(body);
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

  const created = await addReflection(input.businessId, input.affirmationId, input.reflection);
  return NextResponse.json({ ok: true, alreadyLoggedToday: !created });
}
