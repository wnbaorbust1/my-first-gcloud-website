import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { hasAnyRole, STAFF_ROLES } from "@/lib/rbac";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const noteSchema = z.object({
  businessId: z.string().min(1),
  sessionRegistrationId: z.string().min(1).optional(),
  noteType: z.enum(["PRIVATE", "PARTICIPANT_VISIBLE", "RECOMMENDATION", "TASK_RECOMMENDATION"]),
  note: z.string().trim().min(1).max(4000),
  assignedPriority: z.enum(["MUST_DO", "SHOULD_DO", "BONUS"]).optional(),
});

/** Facilitator/admin only — create a note on a business (spec FACILITATOR NOTES). */
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
    input = noteSchema.parse(body);
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

  const note = await prisma.facilitatorNote.create({
    data: {
      authorId: user.id,
      businessId: input.businessId,
      sessionRegistrationId: input.sessionRegistrationId,
      noteType: input.noteType,
      note: input.note,
      assignedPriority: input.assignedPriority,
    },
  });

  return NextResponse.json({ note }, { status: 201 });
}
