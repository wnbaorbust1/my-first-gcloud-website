import type { AuthError } from "@supabase/supabase-js";

/**
 * Translates a Supabase Auth error into copy a teacher should actually
 * see. Falls back to the raw message for anything not explicitly mapped
 * (better an unpolished-but-true message than a silently swallowed one).
 */
export function mapSupabaseAuthError(error: AuthError): string {
  switch (error.code) {
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists. Try logging in instead.";
    case "weak_password":
      return "That password is too easy to guess. Add a few more characters or mix in a number or symbol.";
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Confirm your email first — check your inbox for the link we sent.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return "Too many attempts. Try again in a few minutes.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "Sign-ups are temporarily unavailable. Try again shortly.";
    case "same_password":
      return "That's your current password — choose a different one.";
    case "user_banned":
      return "This account is disabled. Contact support if that's unexpected.";
    default:
      return error.message;
  }
}
