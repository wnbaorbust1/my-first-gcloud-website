import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Password reset tokens: we generate a random token, send/show the raw
 * value to the user, and store only its SHA-256 hash — the same pattern
 * used for e.g. GitHub personal access tokens, so a leaked DB row can't be
 * replayed as a live token.
 */
export function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
