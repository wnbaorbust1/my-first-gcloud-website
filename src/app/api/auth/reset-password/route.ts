import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { hashPassword, hashResetToken } from "@/lib/password";
import { clientIp, checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validations/auth";

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(`reset-password:${clientIp(request)}`, RATE_LIMITS.RESET_PASSWORD);
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
    input = resetPasswordSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const tokenHash = hashResetToken(input.token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt.getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Your password has been reset." });
}
