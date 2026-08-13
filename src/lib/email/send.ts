import "server-only";

/**
 * TRANSACTIONAL EMAIL (launch-hardening audit finding: no email provider
 * anywhere in the app, so password reset was unusable by a real user in
 * production — Known Issue #1 since Phase 1). Uses Resend's plain REST
 * API via `fetch` rather than adding the `resend` SDK as a dependency —
 * one HTTP call is all this needs, matching this app's "don't add a
 * dependency for what a fetch call already does" pattern.
 *
 * Same graceful-degradation shape as Stripe (`isStripeConfigured`) and
 * Blueprint AI (`ANTHROPIC_API_KEY` unset): when `RESEND_API_KEY` /
 * `EMAIL_FROM` aren't set, nothing crashes — the message is logged
 * server-side instead of sent, exactly like every other unconfigured
 * integration in this codebase.
 */
export interface EmailAttachment {
  /** File name as it will appear in the recipient's inbox, e.g. "vision-board.pdf". */
  filename: string;
  /** Base64-encoded file content — Resend's attachment format. */
  content: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Phase 6: Downloads — "Email My Blueprint" attaches the member's PDF. */
  attachments?: EmailAttachment[];
}

export type SendEmailResult = { sent: true } | { sent: false; reason: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  if (!isEmailConfigured()) {
    console.info(`[Blueprint] Email not configured — would have sent "${message.subject}" to ${message.to}`);
    return { sent: false, reason: "not-configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html ?? `<p>${message.text}</p>`,
        ...(message.attachments?.length ? { attachments: message.attachments } : {}),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[Blueprint] Resend send failed", res.status, detail);
      return { sent: false, reason: `provider-error-${res.status}` };
    }

    return { sent: true };
  } catch (err) {
    console.error("[Blueprint] Resend send threw", err);
    return { sent: false, reason: "network-error" };
  }
}
