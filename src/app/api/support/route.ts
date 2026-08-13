import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { clientIp, checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { createSupportRequestSchema } from "@/lib/validations/support";

/** SUPPORT (launch-hardening audit finding: no way for a stuck user to reach a human). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const requests = await prisma.supportRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ requests });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`support-request:${clientIp(request)}`, {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Please wait a bit and try again." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = createSupportRequestSchema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const supportRequest = await prisma.supportRequest.create({
    data: { userId: user.id, subject: input.subject, message: input.message },
  });

  // Notify a real support inbox when one is configured; otherwise this is
  // still fully usable — the request is saved and visible on
  // /admin/support either way (same graceful-degradation pattern as
  // every other unconfigured integration in this app).
  const supportInbox = process.env.SUPPORT_EMAIL;
  if (supportInbox) {
    await sendEmail({
      to: supportInbox,
      subject: `[Blueprint Support] ${input.subject}`,
      text: `From: ${user.firstName} ${user.lastName} (${user.email})\n\n${input.message}`,
    });
  }
  await sendEmail({
    to: user.email,
    subject: "We got your message — Blueprint Support",
    text: `Hi ${user.firstName},\n\nWe received your message: "${input.subject}". Someone will follow up soon.\n\nYour message:\n${input.message}\n\n— Blueprint`,
  });

  return NextResponse.json({ request: supportRequest }, { status: 201 });
}
