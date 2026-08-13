import { z } from "zod";

import type { InstructionField } from "@/lib/roadmap/task-templates";

export const saveDraftSchema = z.object({
  answers: z.record(z.string(), z.string().trim().max(4000)),
});

/** Confirms every answer key is a real step on this task, dropping anything else. */
export function sanitizeAnswers(
  instructions: InstructionField[],
  answers: Record<string, string>,
): Record<string, string> {
  const validKeys = new Set(instructions.map((i) => i.key));
  return Object.fromEntries(Object.entries(answers).filter(([key]) => validKeys.has(key)));
}
