import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  url: z.string().trim().max(500).optional(),
  stage: z.enum(["PASSION", "POWER", "LEGACY"]).optional(),
  category: z.string().trim().max(100).optional(),
});

/** CONTENT MANAGEMENT (spec Prompt 11): "Admin should manage: Resources." */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!can.manageContent(user.role)) {
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

  const resource = await prisma.resource.create({ data: input });

  return NextResponse.json({ resource }, { status: 201 });
}
