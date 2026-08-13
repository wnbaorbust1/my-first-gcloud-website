import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { resolveBlueprintAccess } from "@/lib/blueprint/access";
import { sendEmail } from "@/lib/email/send";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, RATE_LIMITS, TOO_MANY_REQUESTS_BODY } from "@/lib/rate-limit";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { emailVisionBoardSchema } from "@/lib/validations/board-download";

/**
 * "EMAIL MY BLUEPRINT" (Phase 6: Downloads) — the client renders the
 * board to a PDF itself (the same html2canvas + jsPDF path "Download as
 * PDF" uses — see BoardDownloadToolbar) and posts the bytes here to be
 * attached and sent. Deliberately mails only the *authenticated
 * member's own* account email, never an address passed in the request
 * body — this is a delivery convenience for content the member already
 * has full access to, not a way to send mail to a third party.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`vb-email:${user.id}`, RATE_LIMITS.VISION_BOARD_EMAIL);
  if (!rateLimit.allowed) {
    return NextResponse.json(TOO_MANY_REQUESTS_BODY, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = emailVisionBoardSchema.parse(body);
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

  const access = await resolveBlueprintAccess(user.id, input.businessId);
  if (access.state !== "full") {
    return NextResponse.json(
      { error: "Your full Vision Board isn't unlocked yet, so there's nothing to email." },
      { status: 403 },
    );
  }

  const business = await prisma.business.findUniqueOrThrow({
    where: { id: input.businessId },
    select: { name: true },
  });

  const result = await sendEmail({
    to: user.email,
    subject: `Your Vision Board — ${business.name}`,
    text: `Your Vision Board for ${business.name} is attached as a PDF. My Blueprint. My Future. My Legacy.`,
    html: `<p>Your Vision Board for <strong>${business.name}</strong> is attached as a PDF.</p><p>My Blueprint. My Future. My Legacy.</p>`,
    attachments: [{ filename: "vision-board.pdf", content: input.pdfBase64 }],
  });

  if (!result.sent) {
    return NextResponse.json(
      { error: "Email delivery isn't available right now. Try downloading your Vision Board instead." },
      { status: 502 },
    );
  }

  await prisma.boardDownload.create({
    data: { businessId: input.businessId, userId: user.id, document: "vision_board", format: "email" },
  });

  return NextResponse.json({ ok: true, sentTo: user.email });
}
