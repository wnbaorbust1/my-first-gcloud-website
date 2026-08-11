import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/password";
import { clientIp, checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";
import { forgotPasswordSchema } from "@/lib/validations/auth";

const GENERIC_MESSAGE =
  "If an account exists for that email, we've sent password reset instructions.";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(`forgot-password:${clientIp(request)}`, RATE_LIMITS.FORGOT_PASSWORD);
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

  if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "production") {
    // Fail loudly rather than silently mailing a broken localhost link —
    // launch-hardening audit finding: NEXTAUTH_URL falling back to
    // localhost in a misconfigured production deploy.
    console.error("[Blueprint] NEXTAUTH_URL is unset in production — refusing to send a broken reset link.");
    return NextResponse.json({ error: "This isn't configured correctly. Please contact support." }, { status: 500 });
  }
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  // Real delivery when RESEND_API_KEY/EMAIL_FROM are set; otherwise the
  // same graceful-degradation log line this app uses for every
  // unconfigured integration (AI, Stripe) — see src/lib/email/send.ts.
  await sendEmail({
    to: user.email,
    subject: "Reset your Blueprint password",
    text: `Hi ${user.firstName},\n\nSomeone requested a password reset for your Blueprint account. If this was you, reset your password here:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— Blueprint`,
    html: `<p>Hi ${user.firstName},</p><p>Someone requested a password reset for your Blueprint account. If this was you, reset your password here:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p><p>— Blueprint</p>`,
  });

  return NextResponse.json({
    message: GENERIC_MESSAGE,
    // Local/dev only — lets the reset flow be exercised end-to-end without a real inbox.
    ...(process.env.NODE_ENV !== "production" && !isEmailConfigured() ? { devResetUrl: resetUrl } : {}),
  });
}
