import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import {
  promoteVisionBoardGenerationSchema,
  visionBoardGenerationOutputSchema,
} from "@/lib/validations/vision-board-generation";

type SectionRecord = Record<string, unknown>;

function isEmptyLeaf(value: unknown): boolean {
  return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
}

/**
 * Merges a drafted section into whatever the member already has stored,
 * leaf by leaf — not a whole-section overwrite. A drafted section can be
 * "half-grounded" (e.g. legacy.legacyStatement drafted, legacy.impactGroups
 * empty because the context didn't support it), and blindly replacing the
 * whole section would silently erase real member-entered content in the
 * other leaf just because this one AI run had nothing for it. Only a
 * non-empty incoming leaf ever overwrites; an empty/null one is skipped,
 * falling back to whatever's already stored (or the incoming default
 * shape, if nothing was stored yet at all).
 */
function mergeSection(existing: unknown, incoming: SectionRecord): { merged: SectionRecord; changed: boolean } {
  const base = (existing && typeof existing === "object" ? (existing as SectionRecord) : incoming) ?? incoming;
  const merged: SectionRecord = { ...base };
  let changed = false;
  for (const key of Object.keys(incoming)) {
    const value = incoming[key];
    if (!isEmptyLeaf(value)) {
      merged[key] = value;
      changed = true;
    }
  }
  return { merged, changed };
}

/**
 * PROMOTE (Vision Board & Blueprint Generator, structured-storage
 * follow-up, audited 2026-08-13): the only path an AI-drafted vision-board
 * section can take into the real VisionBoardProfile — a member reviews
 * the generation and explicitly chooses which sections to accept.
 * Sections the member doesn't list are left exactly as they were, same
 * partial-update convention as PATCH /api/my-blueprint/vision-board.
 * Within an accepted section, individual leaf fields the model returned
 * null/empty for are skipped rather than overwriting real content with
 * nothing — see `mergeSection` above.
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

  const existingProfile = await prisma.visionBoardProfile.findUnique({
    where: { businessId: generation.businessId },
  });

  const applied: string[] = [];
  const skipped: string[] = [];
  const data: Record<string, unknown> = {};

  for (const field of input.fields) {
    if (field === "affirmations") {
      // A flat array, not a section object — non-empty overwrites, empty is skipped.
      if (payload.affirmations.length > 0) {
        data.affirmations = payload.affirmations;
        applied.push(field);
      } else {
        skipped.push(field);
      }
      continue;
    }

    const incoming = payload[field];
    const existing = existingProfile?.[field as keyof typeof existingProfile];
    const { merged, changed } = mergeSection(existing, incoming);
    if (changed) {
      data[field] = merged;
      applied.push(field);
    } else {
      skipped.push(field);
    }
  }

  const profile = applied.length
    ? await prisma.visionBoardProfile.upsert({
        where: { businessId: generation.businessId },
        create: {
          businessId: generation.businessId,
          ...data,
          lastEditedAt: new Date(),
          lastEditedByUserId: user.id,
        },
        update: { ...data, version: { increment: 1 }, lastEditedAt: new Date(), lastEditedByUserId: user.id },
      })
    : existingProfile;

  await prisma.visionBoardGeneration.update({ where: { id }, data: { promotedAt: new Date() } });

  return NextResponse.json({ profile, applied, skipped });
}
