import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { resolveBlueprintAccess } from "@/lib/blueprint/access";
import { getVisionBoardExport } from "@/lib/blueprint/vision-board";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

const businessIdSchema = z.object({ businessId: z.string().min(1) });

/**
 * "SAVE NEW VERSION" (Phase 6: Downloads) — snapshots the whole
 * currently-assembled board (`getVisionBoardExport()`, the exact same
 * data the rendered board and the GPT export use) into a new
 * `VisionBoardVersion` row. Distinct from `VisionBoardProfile.version`'s
 * silent per-edit counter: that answers "has this changed," this is a
 * real, inspectable checkpoint a member explicitly asked to keep.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = businessIdSchema.parse(body);
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

  const access = await resolveBlueprintAccess(user.id, input.businessId);
  if (access.state !== "full") {
    return NextResponse.json(
      { error: "Your full Vision Board isn't unlocked yet, so there's nothing to save a version of." },
      { status: 403 },
    );
  }

  const snapshot = await getVisionBoardExport(input.businessId);

  const lastVersion = await prisma.visionBoardVersion.findFirst({
    where: { businessId: input.businessId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const version = await prisma.visionBoardVersion.create({
    data: {
      businessId: input.businessId,
      version: (lastVersion?.version ?? 0) + 1,
      snapshot,
      createdByUserId: user.id,
    },
    select: { id: true, version: true, createdAt: true },
  });

  return NextResponse.json({ version });
}

/** Version history list — real saved snapshots only, newest first. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) {
    return NextResponse.json({ error: "businessId is required" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const versions = await prisma.visionBoardVersion.findMany({
    where: { businessId },
    orderBy: { version: "desc" },
    take: 20,
    select: {
      id: true,
      version: true,
      createdAt: true,
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({ versions });
}
