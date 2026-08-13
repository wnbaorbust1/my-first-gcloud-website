import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clientIp, checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validations/auth";

/**
 * Self-service change-password for a signed-in user (Settings page).
 * Found live: the app had signup and the signed-out forgot/reset-password
 * flow, but no way to change a password while already logged in — this
 * closes that gap. Requires the current password (verified via bcrypt)
 * so an already-open, hijacked session can't silently lock the real
 * owner out — the same reasoning NextAuth's own `authorize()` uses.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    `change-password:${clientIp(request)}:${user.id}`,
    RATE_LIMITS.CHANGE_PASSWORD,
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS_BODY, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = changePasswordSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser?.passwordHash) {
    return NextResponse.json(
      { error: "This account doesn't have a password to change (signed in via Google)." },
      { status: 400 },
    );
  }

  const currentIsCorrect = await verifyPassword(input.currentPassword, dbUser.passwordHash);
  if (!currentIsCorrect) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return NextResponse.json({ message: "Your password has been changed." });
}
