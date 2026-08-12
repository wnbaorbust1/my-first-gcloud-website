import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { getMySubscription, getTrialDaysLeft } from "@/lib/billing/access";
import { getPricingData } from "@/lib/billing/pricing-data";
import { getAllCourses } from "@/lib/curriculum/queries";
import { PricingTable } from "@/components/billing/pricing-table";

export const metadata: Metadata = { title: "Pricing — Legacy Command Center" };

export default async function PricingPage() {
  await requireUser();

  const [prices, courses, subscription, trialDaysLeft] = await Promise.all([
    getPricingData(),
    getAllCourses(),
    getMySubscription(),
    getTrialDaysLeft(),
  ]);

  const currentTier =
    subscription && (subscription.status === "trialing" || subscription.status === "active")
      ? subscription.tier
      : null;

  return (
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate">Pricing</p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">
        Unlock the curriculum library<span className="text-rose-gold">.</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm text-slate">
        Every plan unlocks full lesson detail, AI-generated content, the gradebook, and TEKS
        mastery tracking for the courses it covers.
      </p>

      {trialDaysLeft !== null && !currentTier && (
        <p className="mt-4 border border-gold-leaf/50 bg-gold-leaf/10 px-4 py-2 text-sm text-ink">
          You&apos;re {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} into your free trial —
          browse the curriculum library structure freely. Subscribe below to unlock lesson
          content, gradebook, and generation.
        </p>
      )}

      <div className="mt-8">
        <PricingTable prices={prices} courses={courses} currentTier={currentTier} />
      </div>
    </div>
  );
}
