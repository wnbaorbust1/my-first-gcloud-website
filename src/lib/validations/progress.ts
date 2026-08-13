import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

/** WEEKLY CEO CHECK-IN (spec Prompt 9) — the exact 8 questions. */
export const checkInSchema = z.object({
  businessId: z.string().min(1),
  completed: optionalText(2000),
  slowedDown: optionalText(2000),
  biggestWin: optionalText(1000),
  biggestChallenge: optionalText(1000),
  leads: z.number().int().nonnegative().optional(),
  sales: z.number().int().nonnegative().optional(),
  revenueCents: z.number().int().nonnegative().optional(),
  nextWeekFocus: optionalText(1000),
});

export const accountabilitySchema = z.object({
  businessId: z.string().min(1),
  cadence: z.enum(["2_DAYS_WEEK", "3_DAYS_WEEK", "5_DAYS_WEEK", "CUSTOM"]),
  customDays: z.number().int().min(1).max(7).optional(),
});
