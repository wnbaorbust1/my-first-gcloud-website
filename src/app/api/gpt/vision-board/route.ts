import { NextResponse } from "next/server";

import { authenticateApiToken } from "@/lib/api-tokens";
import { getBuilderAccessState, getSyncedMembership } from "@/lib/billing/membership";
import { getVisionBoardExport } from "@/lib/blueprint/vision-board";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";

/**
 * VISION BOARD EXPORT — the data half of the "connect ChatGPT to
 * Blueprint" request: a Custom GPT Action calls this with the member's
 * own personal access token (see src/lib/api-tokens.ts, Settings ->
 * Connect ChatGPT) and gets back everything real that Blueprint knows
 * about their business, shaped around the same pillars as the
 * hand-drawn vision-board reference. Bearer-token auth, not the
 * session cookie — Custom GPT Actions authenticate as an API key, and
 * a browser session cookie is meaningless to ChatGPT's servers anyway.
 */
export async function GET(request: Request) {
  const user = await authenticateApiToken(request);
  if (!user) {
    return NextResponse.json(
      { error: "Missing or invalid token. Generate one in Blueprint under Settings -> Connect ChatGPT." },
      { status: 401 },
    );
  }

  const rateLimit = await checkRateLimit(`gpt-export:${user.id}`, RATE_LIMITS.GPT_EXPORT);
  if (!rateLimit.allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS_BODY, { status: 429 });
  }

  const membership = await prisma.userBusinessMembership.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: { business: { select: { builderAccessEligible: true } } },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "This account hasn't created a business profile in Blueprint yet." },
      { status: 404 },
    );
  }

  // FULL-TIER GATE (Vision Board & Blueprint Generator, audited
  // 2026-08-13): the export exists to feed a full board image — gating
  // it the same as the in-app Scorecard/Vision Board Profile keeps this
  // side door from leaking full content to a business still in preview.
  const billingMembership = await getSyncedMembership(membership.businessId);
  const access = getBuilderAccessState(membership.business.builderAccessEligible, billingMembership);
  if (access.locked) {
    return NextResponse.json(
      {
        error:
          "Your full Vision Board isn't unlocked yet. Attend (and pay for) your qualifying Blueprint Session, or renew your membership, from the Sessions page in Blueprint.",
      },
      { status: 403 },
    );
  }

  const data = await getVisionBoardExport(membership.businessId);
  return NextResponse.json(data);
}
