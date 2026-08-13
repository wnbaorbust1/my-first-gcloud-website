import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { generateVisionBoardRecommendations } from "@/lib/ai/vision-board-generation";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { generateVisionBoardSchema } from "@/lib/validations/vision-board-generation";

/**
 * VISION BOARD GENERATION (Vision Board & Blueprint Generator, audited
 * 2026-08-13): drafts AI suggestions for the narrative sections (My
 * Story, My Why, Legacy, Action Plan, Daily Affirmations) as validated
 * JSON — never an image, never applied automatically. Stored as a
 * VisionBoardGeneration row the member can review and selectively
 * promote into their real VisionBoardProfile (see the [id]/promote
 * route) — nothing here writes to the profile itself.
 *
 * Full-tier gated like every other Vision Board surface: this generates
 * real AI provider spend, and the feature it feeds (My Blueprint,
 * editing, downloads) is itself locked to businesses that have attended
 * and paid for their qualifying session.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`vb-generate:${user.id}`, RATE_LIMITS.VISION_BOARD_GENERATE);
  if (!rateLimit.allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS_BODY, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = generateVisionBoardSchema.parse(body);
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

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: input.businessId },
    select: { builderAccessEligible: true },
  });
  const billingMembership = await getSyncedMembership(input.businessId);
  const access = getBuilderAccessState(business.builderAccessEligible, billingMembership);
  if (access.locked) {
    return NextResponse.json(
      {
        error:
          "Your full Vision Board isn't unlocked yet. Attend (and pay for) your qualifying Blueprint Session, or renew your membership, from the Sessions page.",
      },
      { status: 403 },
    );
  }

  // PHASE 3: AI Blueprint Generator — generation now always succeeds:
  // a real AI call, or the rules-based fallback (src/lib/ai/vision-board-generation.ts)
  // when no key is configured or the model's response was unusable.
  // Either way the result is schema-validated before it ever reaches
  // here, so this route no longer has an error path for "AI didn't
  // work" — only for auth/access/input, same as any other route.
  const result = await generateVisionBoardRecommendations(input.businessId);

  const latestAssessment = await prisma.assessment.findFirst({
    where: { businessId: input.businessId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { id: true },
  });

  const generation = await prisma.visionBoardGeneration.create({
    data: {
      businessId: input.businessId,
      assessmentId: latestAssessment?.id,
      generatedByUserId: user.id,
      model: result.model,
      payload: result.payload,
    },
  });

  return NextResponse.json({ generation, source: result.source });
}
