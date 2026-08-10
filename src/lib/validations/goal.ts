import { z } from "zod";

/** spec Prompt 9 GOALS: "Allow: Annual, Quarterly, 90-Day, Monthly, Weekly." */
export const GOAL_CADENCES = ["WEEKLY", "MONTHLY", "NINETY_DAY", "QUARTERLY", "ANNUAL"] as const;

/** spec Prompt 9 GOALS: the 9 named goal types. */
export const GOAL_TYPES = [
  "REVENUE",
  "PROFIT",
  "LEADS",
  "CUSTOMERS",
  "LAUNCH",
  "MARKETING",
  "SYSTEMS",
  "TEAM",
  "PERSONAL_CEO",
] as const;

export const createGoalSchema = z.object({
  businessId: z.string().min(1),
  title: z.string().trim().min(1, "Give your goal a title").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  targetDate: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  cadence: z.enum(GOAL_CADENCES).optional(),
  goalType: z.enum(GOAL_TYPES).optional(),
  targetValue: z.number().finite().nonnegative().optional(),
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export const updateGoalSchema = z.object({
  progressPercent: z.number().int().min(0).max(100).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
});
