import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/password";
import { forgotPasswordSchema } from "@/lib/validations/auth";

const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions.";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let input;
  try {
    input = forgotPasswordSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Always return the same generic message whether or not the account
  // exists, so this endpoint can't be used to enumerate registered emails.
  if (!user) {
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }

  const { token, tokenHash } = generateResetToken();

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // NOTE: no transactional email provider is wired up yet (see
  // docs/BUILD_STATUS.md "Known Issues"). Until then we log the link a
  // real email would contain, and — for local/dev only — return it in the
  // response body so the reset flow can be exercised end-to-end.
  console.info(`[Blueprint] Password reset link for ${user.email}: ${resetUrl}`);

  return NextResponse.json({
    message: GENERIC_MESSAGE,
    ...(process.env.NODE_ENV !== "production" ? { devResetUrl: resetUrl } : {}),
  });
}
