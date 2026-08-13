import { NextResponse } from "next/server";

import { authenticateApiToken } from "@/lib/api-tokens";
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
  });
  if (!membership) {
    return NextResponse.json(
      { error: "This account hasn't created a business profile in Blueprint yet." },
      { status: 404 },
    );
  }

  const data = await getVisionBoardExport(membership.businessId);
  return NextResponse.json(data);
}
