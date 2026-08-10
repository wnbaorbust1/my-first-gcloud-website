import { z } from "zod";

export const revenuePlanSchema = z.object({
  businessId: z.string().min(1),
  revenueGoalCents: z.number().int().positive(),
  offerPriceCents: z.number().int().positive(),
  conversionRatePercent: z.number().positive().max(100),
  workingWeeks: z.number().int().positive().max(52),
});

export const pricingPlanSchema = z.object({
  businessId: z.string().min(1),
  offerName: z.string().trim().min(1).max(200),
  deliveryTimeHours: z.number().positive(),
  directCostsCents: z.number().int().nonnegative(),
  desiredProfitCents: z.number().int().nonnegative(),
  capacityPerMonth: z.number().int().positive(),
});
