import type { Metadata } from "next";

import { ANNUAL_PRICE_CENTS, MONTHLY_PRICE_CENTS, TRIAL_DAYS, formatCents } from "@/lib/billing/pricing";

export const metadata: Metadata = { title: "Refund & Cancellation Policy — Blueprint" };

const LAST_UPDATED = "August 11, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="font-display text-xl font-semibold text-navy-900">{title}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-navy-700">{children}</div>
    </section>
  );
}

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-600">Legal</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-navy-900">Refund &amp; Cancellation Policy</h1>
      <p className="mt-2 text-sm text-foreground-muted">Last updated {LAST_UPDATED}</p>

      <Section title="1. Free Trial">
        <p>
          After attending a qualifying Blueprint Session, your first {TRIAL_DAYS} days of Blueprint Builder
          access are free. You&apos;re never charged during the trial — you&apos;ll only move to a paid plan if
          you choose one from your Billing page.
        </p>
      </Section>

      <Section title="2. Cancelling Your Membership">
        <p>
          Cancel anytime from your Billing page. You&apos;ll keep full Builder access through the end of the
          period you&apos;ve already paid for ({formatCents(MONTHLY_PRICE_CENTS)}/month or{" "}
          {formatCents(ANNUAL_PRICE_CENTS)}/year) — cancelling doesn&apos;t cut off access immediately, and it
          doesn&apos;t trigger a partial refund for the unused portion of that period. Your account won&apos;t be
          charged again after the current period ends.
        </p>
      </Section>

      <Section title="3. Refunds">
        <p>
          Because Blueprint access, AI usage, and coaching content are delivered immediately on payment, we
          don&apos;t offer automatic refunds for partial billing periods. If you were charged in error — a
          duplicate charge, a charge after you&apos;d already cancelled, or a similar billing mistake — contact
          us via Support and we&apos;ll make it right.
        </p>
      </Section>

      <Section title="4. Your Data After Cancelling">
        <p>
          Cancelling or letting your membership lapse doesn&apos;t delete your business&apos;s work. Your
          assessment, roadmap, and My Blueprint are still there if you reactivate later.
        </p>
      </Section>

      <Section title="5. Reactivating">
        <p>
          You can restart a paid plan anytime from your Billing page — your existing Blueprint picks up
          right where you left it.
        </p>
      </Section>

      <Section title="6. Sponsored Access">
        <p>
          If your access is sponsored by a partner organization rather than paid directly by you, billing
          questions and cancellation are handled through that organization&apos;s agreement with us, not this
          policy.
        </p>
      </Section>

      <Section title="7. Contact">
        <p>
          Billing question or a charge that doesn&apos;t look right? Reach us from the{" "}
          <a href="/support" className="font-medium text-gold-700 underline hover:text-gold-600">
            Support
          </a>{" "}
          page.
        </p>
      </Section>
    </div>
  );
}
