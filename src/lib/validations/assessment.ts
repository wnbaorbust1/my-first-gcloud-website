import { z } from "zod";

import type { QuestionType } from "@/generated/prisma/enums";
import type { QuestionOption } from "@/lib/assessment/questions";

/**
 * A response's valid shape depends on the question it answers, so this
 * can't be one static zod schema — it's built per-question at save time.
 */
export function responseValueSchema(question: {
  questionType: QuestionType;
  minValue: number | null;
  maxValue: number | null;
  options: unknown;
}) {
  switch (question.questionType) {
    case "SCALE_1_5":
      return z.number().int().min(1).max(5);
    case "YES_NO":
      return z.boolean();
    case "NUMBER": {
      const min = question.minValue ?? -Infinity;
      const max = question.maxValue ?? Infinity;
      return z.number().min(min).max(max);
    }
    case "SHORT_ANSWER":
      return z.string().trim().max(2000);
    case "SINGLE_CHOICE": {
      const options = (question.options as QuestionOption[] | null) ?? [];
      const values = options.map((o) => o.value);
      return z.string().refine((v) => values.includes(v), "Not a valid option");
    }
    case "MULTIPLE_CHOICE": {
      const options = (question.options as QuestionOption[] | null) ?? [];
      const values = options.map((o) => o.value);
      return z
        .array(z.string())
        .max(values.length)
        .refine((arr) => arr.every((v) => values.includes(v)), "Not a valid option");
    }
    default:
      return z.unknown();
  }
}

export const saveResponseSchema = z.object({
  questionId: z.string().min(1),
  value: z.unknown(),
});
