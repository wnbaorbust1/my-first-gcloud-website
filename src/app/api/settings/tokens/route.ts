import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { generateApiToken } from "@/lib/api-tokens";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

const createSchema = z.object({
  label: z.string().trim().min(1, "Give this token a label").max(80),
});

/** Personal access tokens for the signed-in member — see src/lib/api-tokens.ts. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tokens = await prisma.personalAccessToken.findMany({
    where: { userId: user.id, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true, lastUsedAt: true },
  });

  return NextResponse.json({ tokens });
}

/** Creates a token and returns the raw value — the only time it's ever visible. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`api-token-create:${user.id}`, RATE_LIMITS.API_TOKEN_CREATE);
  if (!rateLimit.allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS_BODY, { status: 429 });
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

  const existing = await prisma.personalAccessToken.count({
    where: { userId: user.id, revokedAt: null },
  });
  if (existing >= 10) {
    return NextResponse.json(
      { error: "You've reached the limit of 10 active tokens — revoke one first." },
      { status: 400 },
    );
  }

  const { token, tokenHash } = generateApiToken();
  const record = await prisma.personalAccessToken.create({
    data: { userId: user.id, label: input.label, tokenHash },
    select: { id: true, label: true, createdAt: true },
  });

  return NextResponse.json({ token: { ...record, secret: token } }, { status: 201 });
}
