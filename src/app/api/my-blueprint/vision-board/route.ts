import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { parseSectionSources, type EditableSectionKey } from "@/lib/validations/vision-board-data";
import { visionBoardProfileSchema } from "@/lib/validations/vision-board";

/**
 * Upserts whichever structured board *sections* the member submitted
 * (myStory, myWhy, legacy, blueprint, actionPlan, resources,
 * businessModelCanvas, vibes, affirmations, accountability) — see
 * prisma/schema.prisma VisionBoardProfile doc comment and
 * src/lib/validations/vision-board-data.ts for the shared shape. A
 * section omitted entirely is left exactly as it was; a section present
 * replaces that section's JSON in full, since the form always submits a
 * whole section object at once.
 *
 * BOARD VERSION / LAST-EDITED (structured-storage follow-up, audited
 * 2026-08-13): every successful save bumps `version` and stamps
 * `lastEditedAt`/`lastEditedByUserId` with *this* request's user — the
 * "practical minimum" tracking requested, not a per-field audit log.
 *
 * PROVENANCE (Phase 3: AI Blueprint Generator — "separate user answers
 * from AI suggestions"): every section this PATCH touches is marked
 * "user" in `sectionSources`, even if it previously held an AI-promoted
 * draft — the member typing over it here is direct authorship again.
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

  const { businessId, ...sections } = input;

  const existing = await prisma.visionBoardProfile.findUnique({
    where: { businessId },
    select: { sectionSources: true },
  });
  const sectionSources = parseSectionSources(existing?.sectionSources);
  for (const key of Object.keys(sections) as EditableSectionKey[]) {
    sectionSources[key] = "user";
  }

  const profile = await prisma.visionBoardProfile.upsert({
    where: { businessId },
    create: { businessId, ...sections, sectionSources, lastEditedAt: new Date(), lastEditedByUserId: user.id },
    update: {
      ...sections,
      sectionSources,
      version: { increment: 1 },
      lastEditedAt: new Date(),
      lastEditedByUserId: user.id,
    },
  });

  return NextResponse.json({ profile });
}
