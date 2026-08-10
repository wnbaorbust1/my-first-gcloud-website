/**
 * REVENUE PLANNER (spec Prompt 9). Pure calculation — no side effects —
 * so the UI, the API route, and any future consumer (e.g. Monthly
 * Review) all compute the exact same numbers from the exact same inputs.
 *
 * Formula, documented since the spec states the four outputs but not the
 * math behind them:
 * - Sales Needed = revenue goal ÷ offer price, rounded up (you can't make
 *   a fractional sale).
 * - Leads Needed = sales needed ÷ conversion rate, rounded up.
 * - Weekly Target = revenue goal ÷ working weeks (spread the goal evenly
 *   across the weeks you're actually working).
 * - Monthly Target = weekly target × (52 ÷ 12) — the average number of
 *   weeks in a month, not a flat "×4" that would quietly under-count.
 */
export interface RevenuePlanInputs {
  revenueGoalCents: number;
  offerPriceCents: number;
  /** e.g. 2.5 for 2.5%, not 0.025. */
  conversionRatePercent: number;
  workingWeeks: number;
}

export interface RevenuePlanResult {
  salesNeeded: number;
  leadsNeeded: number;
  weeklyTargetCents: number;
  monthlyTargetCents: number;
}

const WEEKS_PER_MONTH = 52 / 12;

export function calculateRevenuePlan(inputs: RevenuePlanInputs): RevenuePlanResult {
  const salesNeeded = Math.ceil(inputs.revenueGoalCents / inputs.offerPriceCents);
  const leadsNeeded = Math.ceil(salesNeeded / (inputs.conversionRatePercent / 100));
  const weeklyTargetCents = Math.round(inputs.revenueGoalCents / inputs.workingWeeks);
  const monthlyTargetCents = Math.round(weeklyTargetCents * WEEKS_PER_MONTH);

  return { salesNeeded, leadsNeeded, weeklyTargetCents, monthlyTargetCents };
}
