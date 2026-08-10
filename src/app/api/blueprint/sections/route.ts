import { NextResponse } from "next/server";

import { ensureBlueprintDocument } from "@/lib/roadmap/blueprint";
import { prisma } from "@/lib/prisma";
import { SECTION_STAGE } from "@/lib/blueprint/sections";
import { editSectionSchema } from "@/lib/validations/blueprint";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";

/**
 * In-place editing from My Blueprint (spec: "Allow editing from My
 * Blueprint"). Upserts by (documentId, title) — same pattern as
 * saveTaskResponseToBlueprint — so a manual edit and a "Save to My
 * Blueprint" from Builder never fight over two different rows for the
 * same section. `sourceRoadmapTaskId` is left untouched: it records
 * where the section was *last auto-populated from*, which stays true
 * even after a member edits the wording by hand.
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = editSectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { businessId, title, content } = parsed.data;

  const stage = SECTION_STAGE[title];
  if (!stage) {
    return NextResponse.json({ error: "Unknown Blueprint section" }, { status: 400 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await ensureBlueprintDocument(businessId);

  const section = await prisma.documentSection.upsert({
    where: { documentId_title: { documentId: document.id, title } },
    create: { documentId: document.id, stage, title, content, lastEditedAt: new Date() },
    update: { content, lastEditedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "blueprint_section_edited",
      entityType: "DocumentSection",
      entityId: section.id,
      metadata: { businessId, title },
    },
  });

  return NextResponse.json({ ok: true, updatedAt: section.updatedAt });
}
