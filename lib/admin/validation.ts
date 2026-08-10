import { z } from "zod";
import { SEGMENT_KEYS } from "@/lib/ai/schemas";

const segmentInputSchema = z.object({
  segment_key: z.enum(SEGMENT_KEYS),
  title: z.string().trim().min(1, "Every segment needs a title.").max(200),
  description: z.string().trim().max(2000),
  duration_minutes: z.number().int().min(1).max(70),
});

export const lessonSaveSchema = z.object({
  title: z.string().trim().min(1, "The lesson needs a title.").max(300),
  segments: z
    .array(segmentInputSchema)
    .length(6, "All 6 class-period segments are required.")
    .refine(
      (segments) => new Set(segments.map((s) => s.segment_key)).size === 6,
      "Each of the 6 segment types must appear exactly once.",
    ),
  i_do: z.string().trim().max(4000),
  we_do: z.string().trim().max(4000),
  you_do_together: z.string().trim().max(4000),
  you_do: z.string().trim().max(4000),
  qsssa_question: z.string().trim().max(1000),
  qsssa_signal: z.string().trim().max(500),
  qsssa_stem: z.string().trim().max(500),
  qsssa_share: z.string().trim().max(1000),
  qsssa_assess: z.string().trim().max(1000),
  // The DB itself caps homework at 5 (even in draft) and requires exactly 5
  // to publish — this just mirrors the cap so a bad request fails with a
  // clear message here rather than a raw Postgres error.
  homework: z.array(z.string().trim().max(1000)).max(5),
  teksIds: z.array(z.string().uuid()).max(20),
});

export type LessonSaveInput = z.infer<typeof lessonSaveSchema>;
