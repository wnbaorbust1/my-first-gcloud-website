import "server-only";

import { logError } from "@/lib/observability/log-error";

/**
 * GOHIGHLEVEL LEAD WORKFLOW — pushes real member events into the
 * business owner's GHL inbound webhook so her nurture workflow can pick
 * them up. Deliberately fire-and-forget from the caller's perspective:
 * a GHL outage or misconfigured URL must never block a signup or an
 * assessment completion, so failures are swallowed here and logged via
 * the same self-hosted error log used everywhere else in the app,
 * never re-thrown.
 *
 * GHL_WEBHOOK_URL is optional — unset in any environment that hasn't
 * configured a workflow (e.g. local dev), in which case this is a no-op
 * rather than an error.
 */
export type GhlEvent = "signup" | "assessment_completed";

export interface GhlLeadPayload {
  event: GhlEvent;
  email: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  /** Only set for "assessment_completed". */
  stage: string | null;
  /** Only set for "assessment_completed". */
  healthScorePercent: number | null;
}

export async function notifyGhl(payload: GhlLeadPayload): Promise<void> {
  const url = process.env.GHL_WEBHOOK_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source: "blueprint_app",
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      await logError(new Error(`GHL webhook returned ${res.status}`), {
        route: "integrations/ghl",
        event: payload.event,
        status: res.status,
      });
    }
  } catch (err) {
    await logError(err, { route: "integrations/ghl", event: payload.event });
  }
}
