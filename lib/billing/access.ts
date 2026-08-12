import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { TRIAL_DAYS } from "@/lib/billing/constants";
import type { Database } from "@/types/supabase";

export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

/**
 * Course-level gate: mirrors the RLS check that already protects lesson
 * content (see the `lessons_select` / `lesson_segments_select` policies,
 * both built on `has_course_access`). Calling the same Postgres function
 * here — rather than re-deriving the logic in TypeScript — means this can
 * never drift from what RLS actually enforces: admins always pass, and a
 * regular teacher passes only with a `trialing`/`active` subscription row
 * whose tier covers this course.
 *
 * Note: there's no separate "free trial" bypass here. The signup flow's
 * 14-day trial (see TRIAL_DAYS) is pure messaging — it doesn't unlock
 * course content on its own, it's just framing for the same "subscribe to
 * unlock" paywall a canceled or never-subscribed teacher sees. That's a
 * product-scope call, not a schema limitation: a real card-less trial tier
 * would need its own subscriptions.status value and a matching branch in
 * has_course_access() (billing phase +1, if wanted).
 */
export async function hasCourseAccess(courseId: string): Promise<boolean> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("has_course_access", {
    target_course_id: courseId,
  });

  if (error) {
    console.error("hasCourseAccess RPC failed", error);
    return false;
  }
  return data === true;
}

/** The signed-in teacher's own subscription row, or null if they've never subscribed. */
export async function getMySubscription(): Promise<Subscription | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getMySubscription failed", error);
    return null;
  }
  return data;
}

/**
 * Days left in the display-only free trial window, or null once it's
 * expired. Purely cosmetic (see hasCourseAccess's comment) — used for
 * "N days left in your trial" messaging, never for an access decision.
 */
export async function getTrialDaysLeft(): Promise<number | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const trialEnds = new Date(profile.created_at);
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);

  const msLeft = trialEnds.getTime() - Date.now();
  if (msLeft <= 0) return null;
  return Math.ceil(msLeft / (1000 * 60 * 60 * 24));
}
