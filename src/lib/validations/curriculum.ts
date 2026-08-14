import { z } from "zod";

export const completeDailyActionSchema = z.object({
  businessId: z.string().min(1),
  proofNote: z.string().trim().max(1000).optional(),
});

export const completeWeekSchema = z.object({
  businessId: z.string().min(1),
  reviewNote: z.string().trim().min(1, "Write a short answer to the weekly review question first.").max(2000),
});
