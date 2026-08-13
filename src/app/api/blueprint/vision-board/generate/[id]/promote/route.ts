import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import {
  promoteVisionBoardGenerationSchema,
  visionBoardGenerationOutputSchema,
} from "@/lib/validations/vision-board-generation";

/**
 * PROMOTE (Vision Board & Blueprint Generator, audited 2026-08-13): the
 * only path an AI-drafted vision-board field can take into the real
 * VisionBoardProfile — a member reviews the generation and explicitly
 * chooses which fields to accept. Nothing here is automatic; fields the
 * member doesn't list are left exactly as they were, same partial-update
 * convention as PATCH /api/my-blueprint/vision-board. A field whose
 * drafted value is null (the model had nothing grounded to say) is
 * skipped rather than overwriting real content with nothing.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const generation = await prisma.visionBoardGeneration.findUnique({ where: { id } });
  if (!generation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const allowed = await assertBusinessAccess(user.id, user.role, generation.businessId);
  if (!allowed) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: generation.businessId },
    select: { builderAccessEligible: true },
  });
  const billingMembership = await getSyncedMembership(generation.businessId);
  const access = getBuilderAccessState(business.builderAccessEligible, billingMembership);
  if (access.locked) {
    return NextResponse.json(
      { error: "Your full Vision Board isn't unlocked yet." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = promoteVisionBoardGenerationSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Re-validates the stored payload rather than trusting the Json column's
  // shape blindly — cheap, and it's the same guard the create route ran.
  const payload = visionBoardGenerationOutputSchema.parse(generation.payload);

  const applied: string[] = [];
  const skipped: string[] = [];
  const data: Record<string, string> = {};

  for (const field of input.fields) {
    const value = payload[field];
    if (value === null) {
      skipped.push(field);
      continue;
    }
    data[field] = Array.isArray(value) ? value.join("\n") : value;
    applied.push(field);
  }

  const profile = applied.length
    ? await prisma.visionBoardProfile.upsert({
        where: { businessId: generation.businessId },
        create: { businessId: generation.businessId, ...data },
        update: data,
      })
    : await prisma.visionBoardProfile.findUnique({ where: { businessId: generation.businessId } });

  await prisma.visionBoardGeneration.update({ where: { id }, data: { promotedAt: new Date() } });

  return NextResponse.json({ profile, applied, skipped });
}
