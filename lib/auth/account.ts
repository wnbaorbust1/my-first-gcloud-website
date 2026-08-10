import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Whether an account exists for `email`. Used only to give login a clear
 * "no account found" message instead of the generic "invalid credentials"
 * Supabase returns for both wrong-password and no-such-user — an explicit
 * product requirement here. That's a deliberate, small trade against
 * user-enumeration hardening: an attacker can already infer this same
 * information for free via the signup form (which does say "already
 * registered"), so this doesn't meaningfully change the app's exposure,
 * and it's rate-limited the same as any other login attempt.
 */
export async function accountExistsForEmail(email: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("accountExistsForEmail query failed", error);
    // Fail toward the generic "incorrect email or password" message rather
    // than falsely claiming an account doesn't exist.
    return true;
  }

  return data !== null;
}
