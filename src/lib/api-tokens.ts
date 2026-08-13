import "server-only";

import { randomBytes, createHash } from "crypto";

import { prisma } from "@/lib/prisma";

/**
 * PERSONAL ACCESS TOKENS — same store-only-the-hash pattern as password
 * reset tokens (see src/lib/password.ts), prefixed so a token is
 * recognizable at a glance (in logs, in a pasted Action config) as a
 * Blueprint credential and not, say, a session cookie.
 */
const TOKEN_PREFIX = "bp_live_";

export function generateApiToken(): { token: string; tokenHash: string } {
  const token = TOKEN_PREFIX + randomBytes(32).toString("hex");
  const tokenHash = hashApiToken(token);
  return { token, tokenHash };
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Resolves a raw Bearer token (as sent by a Custom GPT Action, or any
 * other script) to the user it belongs to. Returns null for a missing,
 * malformed, unknown, or revoked token — callers should treat that the
 * same as "not authenticated" (401), same as a missing session cookie.
 * Updates lastUsedAt on success so the Settings token list can show real
 * "last used" info instead of just "created."
 */
export async function authenticateApiToken(
  request: Request,
): Promise<{ id: string; role: string } | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const tokenHash = hashApiToken(token);
  const record = await prisma.personalAccessToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, role: true, isActive: true } } },
  });
  if (!record || record.revokedAt || !record.user.isActive) return null;

  // Best-effort — a slow write here should never block the request.
  prisma.personalAccessToken
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return { id: record.user.id, role: record.user.role };
}
