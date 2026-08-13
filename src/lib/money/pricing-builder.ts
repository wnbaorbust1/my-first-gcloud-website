/**
 * PRICING BUILDER (spec Prompt 9). Pure calculation. Spec: "Output:
 * Estimated sustainable pricing range and considerations. Do not
 * portray result as guaranteed market pricing" — the non-guarantee
 * framing is generated as part of the result itself, not a UI-only
 * disclaimer that could be dropped somewhere the numbers are reused.
 *
 * Formula: the break-even + target-profit price at full capacity is the
 * center of the range —
 *   targetPriceCents = directCostsCents + (desiredProfitCents ÷ capacityPerMonth)
 * — i.e. "if I deliver at full capacity every month, what does each unit
 * need to sell for to cover its own cost and still hit my monthly profit
 * goal." The low/high band (±15%) is an estimate, not a guarantee — real
 * market pricing depends on competitors, positioning, and demand this
 * calculator has no visibility into, which is exactly what
 * `considerations` says.
 */
export interface PricingPlanInputs {
  offerName: string;
  deliveryTimeHours: number;
  directCostsCents: number;
  desiredProfitCents: number;
  capacityPerMonth: number;
}

export interface PricingPlanResult {
  estimatedLowCents: number;
  estimatedHighCents: number;
  considerations: string;
}

const BAND = 0.15;

export function calculatePricingPlan(inputs: PricingPlanInputs): PricingPlanResult {
  const targetPriceCents = inputs.directCostsCents + inputs.desiredProfitCents / inputs.capacityPerMonth;
  const estimatedLowCents = Math.round(targetPriceCents * (1 - BAND));
  const estimatedHighCents = Math.round(targetPriceCents * (1 + BAND));

  const hourlyAtTarget = inputs.deliveryTimeHours > 0 ? targetPriceCents / inputs.deliveryTimeHours / 100 : null;

  const considerations = [
    `This is an estimated sustainable range based on your costs, profit goal, and capacity — not a guaranteed market price. Real-world pricing also depends on your competitors, your positioning, and what buyers in your market are actually willing to pay, none of which this calculator can see.`,
    `At the center of this range, "${inputs.offerName || "this offer"}" works out to about $${hourlyAtTarget?.toFixed(0) ?? "—"}/hour of delivery time — sanity-check that against what your time is actually worth.`,
    `If you can't fill all ${inputs.capacityPerMonth} slots most months, your real profit will fall short of this goal at the low end of the range — consider whether that capacity is realistic before committing to it.`,
  ].join(" ");

  return { estimatedLowCents, estimatedHighCents, considerations };
}
