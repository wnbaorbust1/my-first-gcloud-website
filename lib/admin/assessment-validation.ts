import { z } from "zod";
import { QUESTION_TYPES } from "@/lib/curriculum/constants";

const questionInputSchema = z.object({
  id: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().trim().min(1, "Every question needs a prompt.").max(2000),
  points: z.number().int().min(1, "Points must be at least 1.").max(100),
  options: z.array(z.string().trim().min(1).max(300)).max(8).nullable(),
  correct_answer: z.string().trim().max(1000).nullable(),
  pairs: z
    .array(z.object({ left: z.string().trim().min(1).max(300), right: z.string().trim().min(1).max(300) }))
    .max(15)
    .nullable(),
});

export const assessmentSaveSchema = z.object({
  title: z.string().trim().min(1, "The assessment needs a title.").max(300),
  // The DB requires at least one question to publish (mirrored here so a
  // bad request fails with a clear message) but allows an empty question
  // list while drafting.
  questions: z.array(questionInputSchema).max(50),
  answerKey: z.string().trim().max(8000),
  teksIds: z.array(z.string().uuid()).max(20),
});

export type AssessmentSaveInput = z.infer<typeof assessmentSaveSchema>;
