import { z } from "zod";

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
});

export const updateGoalSchema = z.object({
  progressPercent: z.number().int().min(0).max(100).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "ABANDONED"]).optional(),
});
