import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  sessionType: z.enum(["PASSION", "POWER", "LEGACY", "GROWTH"]),
  description: z.string().trim().max(4000).optional(),
  format: z.enum(["VIRTUAL", "IN_PERSON"]).default("VIRTUAL"),
  startsAt: z.string().min(1),
  capacity: z.number().int().positive().optional(),
  facilitatorId: z.string().min(1).optional(),
  programId: z.string().min(1).optional(),
});

/** CONTENT MANAGEMENT (spec Prompt 11): "Admin should manage: Sessions." */
export async function POST(request: Request) {
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
    input = createSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const session = await prisma.sessionOffering.create({
    data: {
      title: input.title,
      sessionType: input.sessionType,
      description: input.description,
      format: input.format,
      startsAt: new Date(input.startsAt),
      capacity: input.capacity,
      facilitatorId: input.facilitatorId,
      programId: input.programId,
      status: "SCHEDULED",
    },
  });

  return NextResponse.json({ session }, { status: 201 });
}
