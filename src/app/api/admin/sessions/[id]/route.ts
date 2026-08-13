import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

/**
 * "Change sessions" (Phase 7 continued) — full-field editing beyond the
 * original status/facilitator/capacity-only control. Every field is
 * optional so the admin session-edit form can PATCH just what changed;
 * `undefined` (omitted) means "leave as-is," `null` explicitly clears an
 * optional field.
 */
const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  sessionType: z.enum(["PASSION", "POWER", "LEGACY", "GROWTH"]).optional(),
  description: z.string().trim().max(4000).nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
  format: z.enum(["VIRTUAL", "IN_PERSON"]).optional(),
  startsAt: z.string().min(1).optional(),
  endsAt: z.string().min(1).nullable().optional(),
  location: z.string().trim().max(300).nullable().optional(),
  virtualLink: z.string().trim().max(500).nullable().optional(),
  priceCents: z.number().int().nonnegative().nullable().optional(),
  facilitatorId: z.string().min(1).nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  programId: z.string().min(1).nullable().optional(),
  organizationId: z.string().min(1).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sessionId } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageSessions(user.role)) {
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

  const session = await prisma.sessionOffering.findUnique({ where: { id: sessionId } });
  if (!session) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { startsAt, endsAt, ...rest } = input;

  const updated = await prisma.sessionOffering.update({
    where: { id: sessionId },
    data: {
      ...rest,
      ...(startsAt !== undefined ? { startsAt: new Date(startsAt) } : {}),
      ...(endsAt !== undefined ? { endsAt: endsAt === null ? null : new Date(endsAt) } : {}),
    },
  });

  return NextResponse.json({ session: updated });
}
