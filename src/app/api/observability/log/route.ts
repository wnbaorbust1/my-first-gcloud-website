import { NextResponse } from "next/server";
import { z } from "zod";

import { logError } from "@/lib/observability/log-error";
import { clientIp, checkRateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

const bodySchema = z.object({
  message: z.string().trim().max(2000),
  stack: z.string().trim().max(8000).optional(),
  digest: z.string().trim().max(200).optional(),
  url: z.string().trim().max(500).optional(),
});

/**
 * Reporting endpoint for the client-side error boundaries
 * (src/app/error.tsx, src/app/global-error.tsx) — a Client Component
 * can't import `prisma`/`logError` directly, so it POSTs here instead.
 * Deliberately open to logged-out visitors too (an error on the public
 * marketing pages is still worth capturing), just rate-limited by IP so
 * this can't be used to flood the ErrorLog table.
 */
export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(`observability-log:${clientIp(request)}`, {
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const user = await getCurrentUser();
  const clientError = new Error(parsed.data.message);
  if (parsed.data.stack) clientError.stack = parsed.data.stack;
  await logError(clientError, {
    route: "client",
    digest: parsed.data.digest,
    url: parsed.data.url,
    userId: user?.id,
  });

  return NextResponse.json({ ok: true });
}
