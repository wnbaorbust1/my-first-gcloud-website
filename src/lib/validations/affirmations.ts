import { z } from "zod";

export const affirmationActionSchema = z.object({
  businessId: z.string().min(1),
  affirmationId: z.string().min(1),
});

export const reflectionSchema = affirmationActionSchema.extend({
  reflection: z.string().trim().min(1, "Write a quick reflection first.").max(1000),
});

export const connectActionSchema = affirmationActionSchema.extend({
  taskId: z.string().min(1),
});

export const moodCheckInSchema = z.object({
  businessId: z.string().min(1),
  mood: z.enum([
    "FOCUSED",
    "CONFIDENT",
    "EXCITED",
    "OVERWHELMED",
    "CONFUSED",
    "DISCOURAGED",
    "TIRED",
    "STUCK",
    "READY_TO_WORK",
    "NEED_SMALLER_STEP",
  ]),
  note: z.string().trim().max(1000).optional(),
});
