import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getMySubscription } from "@/lib/billing/access";
import { getAllCourses } from "@/lib/curriculum/queries";
import { LedgerRow } from "@/components/ui/ledger-row";
import { StatusStamp } from "@/components/ui/status-stamp";
import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { TIER_LABELS } from "@/lib/billing/constants";

export const metadata: Metadata = { title: "Billing — Legacy Command Center" };

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: { checkout?: string };
}) {
  await requireUser();

  const [subscription, courses] = await Promise.all([getMySubscription(), getAllCourses()]);
  const courseNames = new Map(courses.map((c) => [c.id, c.display_name]));

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Account</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Billing<span className="text-rose-gold">.</span>
      </h1>

      {searchParams.checkout === "success" && (
        <p className="mt-4 border border-gold-leaf/50 bg-gold-leaf/10 px-4 py-2 text-sm text-ink">
          Subscription confirmed — thanks! It may take a moment to appear below.
        </p>
      )}

      {!subscription ? (
        <div className="mt-8 border border-rose-gold/40 p-5">
          <p className="text-sm text-slate">
            No subscription yet — subscribe to unlock lesson content, AI generation, and the
            gradebook.
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block border border-ink px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-cream"
          >
            View plans
          </Link>
        </div>
      ) : (
        <section className="mt-8 border border-rose-gold/40 p-5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-slate">
            Current subscription
          </p>
          <div className="mt-3">
            <LedgerRow meta={TIER_LABELS[subscription.tier]}>Plan</LedgerRow>
            <LedgerRow
              meta={subscription.status}
              stamp={
                subscription.status === "active" || subscription.status === "trialing" ? (
                  <StatusStamp label={subscription.status} />
                ) : null
              }
            >
              Status
            </LedgerRow>
            {subscription.current_period_end && (
              <LedgerRow meta={new Date(subscription.current_period_end).toLocaleDateString()}>
                {subscription.status === "canceled" ? "Access until" : "Renews"}
              </LedgerRow>
            )}
            {subscription.course_ids.length > 0 && (
              <LedgerRow
                meta={subscription.course_ids.map((id) => courseNames.get(id) ?? id).join(", ")}
              >
                Courses
              </LedgerRow>
            )}
          </div>

          <ManageBillingButton />
        </section>
      )}
    </div>
  );
}
