import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { visionBoardProfileSchema } from "@/lib/validations/vision-board";

/**
 * Upserts the Vision Board Profile fields the schema has no other home
 * for (My Vibes, Resources, Business Model Canvas, Daily Affirmations,
 * accountability partner) — see prisma/schema.prisma VisionBoardProfile
 * doc comment. One PATCH, whichever fields are present get written;
 * omitted fields are left as-is (not cleared), same partial-update
 * convention as the other tools' edit routes.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = visionBoardProfileSchema.parse(body);
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

  const { businessId, ...fields } = input;

  const profile = await prisma.visionBoardProfile.upsert({
    where: { businessId },
    create: { businessId, ...fields },
    update: fields,
  });

  return NextResponse.json({ profile });
}
