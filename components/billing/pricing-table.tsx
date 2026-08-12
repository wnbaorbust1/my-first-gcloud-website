"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { createCheckoutSessionAction, type CheckoutActionState } from "@/lib/billing/checkout-actions";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  SUBSCRIPTION_TIERS,
  TIER_LABELS,
  TIER_DESCRIPTIONS,
  TIER_COURSE_COUNT,
  BILLING_INTERVAL_LABELS,
  type BillingInterval,
} from "@/lib/billing/constants";
import type { PriceDisplay } from "@/lib/billing/pricing-data";
import type { SubscriptionTier } from "@/types/supabase";

type CourseOption = { id: string; display_name: string; accent_color: string };

const initialState: CheckoutActionState = { error: null };

function CourseCheckboxes({
  courses,
  max,
  selected,
  onChange,
}: {
  courses: CourseOption[];
  max: number;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((c) => c !== id));
      return;
    }
    if (selected.length >= max) return;
    onChange([...selected, id]);
  }

  return (
    <fieldset className="mt-3 space-y-1.5">
      <legend className="font-mono text-[11px] uppercase tracking-wide text-slate">
        Choose {max} course{max === 1 ? "" : "s"}
      </legend>
      {courses.map((course) => {
        const checked = selected.includes(course.id);
        const disabled = !checked && selected.length >= max;
        return (
          <label
            key={course.id}
            className={`flex items-center gap-2 text-sm ${disabled ? "text-slate/50" : "text-ink"}`}
          >
            <input
              type="checkbox"
              name="courseIds"
              value={course.id}
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(course.id)}
            />
            {course.display_name}
          </label>
        );
      })}
    </fieldset>
  );
}

function TierCard({
  tier,
  priceByInterval,
  interval,
  courses,
  isCurrentPlan,
}: {
  tier: SubscriptionTier;
  priceByInterval: Partial<Record<BillingInterval, PriceDisplay>>;
  interval: BillingInterval;
  courses: CourseOption[];
  isCurrentPlan: boolean;
}) {
  const [state, formAction] = useFormState(createCheckoutSessionAction, initialState);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  const price = priceByInterval[interval];
  const courseCount = TIER_COURSE_COUNT[tier];
  const ready = !price ? false : courseCount === 0 || selectedCourseIds.length === courseCount;

  return (
    <div className="flex flex-col border border-rose-gold/40 p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-slate">{TIER_LABELS[tier]}</p>
      <p className="mt-3 font-display text-3xl font-semibold text-ink">
        {price ? price.formattedAmount : "—"}
        {price && (
          <span className="ml-1 font-sans text-sm font-normal text-slate">
            / {interval === "monthly" ? "mo" : "yr"}
          </span>
        )}
      </p>
      <p className="mt-2 text-sm text-slate">{TIER_DESCRIPTIONS[tier]}</p>

      {!price && (
        <p className="mt-3 font-mono text-xs text-rose-gold">Not available yet — price not configured.</p>
      )}

      {price && courseCount > 0 && (
        <CourseCheckboxes
          courses={courses}
          max={courseCount}
          selected={selectedCourseIds}
          onChange={setSelectedCourseIds}
        />
      )}

      <div className="mt-4 flex-1" />

      {isCurrentPlan ? (
        <p className="border border-ink px-4 py-2 text-center font-mono text-xs uppercase tracking-wide text-ink">
          Current plan
        </p>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="tier" value={tier} />
          <input type="hidden" name="interval" value={interval} />
          {selectedCourseIds.map((id) => (
            <input key={id} type="hidden" name="courseIds" value={id} />
          ))}
          <SubmitButton pendingLabel="Redirecting…" disabled={!ready}>
            Choose {TIER_LABELS[tier]}
          </SubmitButton>
          {state.error && (
            <p role="alert" className="mt-2 text-xs text-rose-gold">
              {state.error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export function PricingTable({
  prices,
  courses,
  currentTier,
}: {
  prices: PriceDisplay[];
  courses: CourseOption[];
  currentTier: SubscriptionTier | null;
}) {
  const [interval, setInterval] = useState<BillingInterval>("monthly");

  const byTier = useMemo(() => {
    const map = new Map<SubscriptionTier, Partial<Record<BillingInterval, PriceDisplay>>>();
    for (const tier of SUBSCRIPTION_TIERS) map.set(tier, {});
    for (const p of prices) {
      map.get(p.tier)![p.interval] = p;
    }
    return map;
  }, [prices]);

  return (
    <div>
      <div className="flex items-center gap-2">
        {(["monthly", "annual"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setInterval(option)}
            className={
              option === interval
                ? "border border-ink bg-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-cream"
                : "border border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink hover:bg-ink/5"
            }
          >
            {BILLING_INTERVAL_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {SUBSCRIPTION_TIERS.map((tier) => (
          <TierCard
            key={tier}
            tier={tier}
            priceByInterval={byTier.get(tier) ?? {}}
            interval={interval}
            courses={courses}
            isCurrentPlan={currentTier === tier}
          />
        ))}
      </div>
    </div>
  );
}
