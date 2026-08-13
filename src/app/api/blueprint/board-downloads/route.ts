import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { prisma } from "@/lib/prisma";
import { assertBusinessAccess, getCurrentUser } from "@/lib/session";
import { logBoardDownloadSchema } from "@/lib/validations/board-download";

/**
 * DOWNLOAD HISTORY (Vision Board & Blueprint Generator, structured-storage
 * follow-up, audited 2026-08-13): one row per time a member (or an admin
 * viewing on their behalf) actually downloads/prints/emails the rendered
 * Vision Board or Scorecard — written by PrintButton or (Phase 6:
 * Downloads) BoardDownloadToolbar right before the corresponding action
 * fires (`window.print()`, a client-generated PDF/PNG save, or an email
 * send). A page *view* isn't a *download*, so this is only ever called
 * from an explicit action, never on render. Fire-and-forget from the
 * client — a logging failure must never block the member from actually
 * getting their file.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  let input;
  try {
    input = logBoardDownloadSchema.parse(body);
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

  const download = await prisma.boardDownload.create({
    data: { businessId: input.businessId, userId: user.id, document: input.document, format: input.format },
  });

  return NextResponse.json({ download });
}
