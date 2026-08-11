import { z } from "zod";
import { QUESTION_TYPES } from "@/lib/curriculum/constants";

/**
 * Zod schemas for every AI structured output in this app. Passed to
 * `zodOutputFormat()` (from `@anthropic-ai/sdk/helpers/zod`) so Claude's
 * response is constrained to this shape, and the SDK validates the parsed
 * response against this same schema client-side — array-length
 * constraints like `.length(6)` aren't representable in the wire-level
 * JSON schema Claude sees (the SDK strips them, encoding a hint in the
 * field's `description` instead), but they're still enforced when the
 * response comes back: a lesson with the wrong segment/homework count
 * fails to parse rather than being silently accepted.
 */

export const SEGMENT_KEYS = [
  "bell_ringer",
  "mini_lesson",
  "modeling",
  "activity",
  "debrief",
  "exit_ticket",
] as const;

const generatedSegmentSchema = z.object({
  segment_key: z.enum(SEGMENT_KEYS),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  duration_minutes: z.number().int().min(1).max(70),
});

export const generatedLessonSchema = z.object({
  title: z.string().min(1).max(300),
  segments: z.array(generatedSegmentSchema).length(6),
  i_do: z.string().min(1).max(4000),
  we_do: z.string().min(1).max(4000),
  you_do_together: z.string().min(1).max(4000),
  you_do: z.string().min(1).max(4000),
  qsssa_question: z.string().min(1).max(1000),
  qsssa_signal: z.string().min(1).max(500),
  qsssa_stem: z.string().min(1).max(500),
  qsssa_share: z.string().min(1).max(1000),
  qsssa_assess: z.string().min(1).max(1000),
  homework: z.array(z.string().min(1).max(1000)).length(5),
  // TEKS codes chosen from the candidate list given in the prompt — may be
  // empty (rare, when truly none of the candidates apply).
  teks_codes: z.array(z.string()).max(10),
});
export type GeneratedLesson = z.infer<typeof generatedLessonSchema>;

// ── AI Lesson Assistant (single-field edit) ────────────────────────────

export const ASSISTANT_TARGET_FIELDS = [
  "title",
  "i_do",
  "we_do",
  "you_do_together",
  "you_do",
  "qsssa_question",
  "qsssa_signal",
  "qsssa_stem",
  "qsssa_share",
  "qsssa_assess",
  "segment_bell_ringer",
  "segment_mini_lesson",
  "segment_modeling",
  "segment_activity",
  "segment_debrief",
  "segment_exit_ticket",
  "homework",
] as const;
export type AssistantTargetField = (typeof ASSISTANT_TARGET_FIELDS)[number];

// A flat, fully-required-but-nullable shape rather than a discriminated
// union — broader structured-output compatibility, and the app just reads
// whichever branch matches target_field.
export const assistantEditSchema = z.object({
  target_field: z.enum(ASSISTANT_TARGET_FIELDS),
  explanation: z.string().min(1).max(500),
  text_value: z.string().max(4000).nullable(),
  segment_title: z.string().max(200).nullable(),
  segment_description: z.string().max(2000).nullable(),
  homework_items: z.array(z.string().min(1).max(1000)).length(5).nullable(),
});
export type AssistantEdit = z.infer<typeof assistantEditSchema>;

// ── Fill curriculum gaps ────────────────────────────────────────────────

const gapSuggestionSchema = z.object({
  week_number: z.number().int().min(1).max(36),
  day_number: z.number().int().min(1).max(5),
  suggested_title: z.string().min(1).max(300),
  suggested_topic: z.string().min(1).max(1000),
  rationale: z.string().min(1).max(500),
});

export const gapSuggestionsSchema = z.object({
  suggestions: z.array(gapSuggestionSchema).max(50),
});
export type GapSuggestion = z.infer<typeof gapSuggestionSchema>;

// ── Shared: a lesson-in-progress, as edited client-side (possibly unsaved) ─

const lessonSnapshotSegmentSchema = z.object({
  segment_key: z.enum(SEGMENT_KEYS),
  title: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.number(),
});

export const lessonSnapshotSchema = z.object({
  title: z.string(),
  segments: z.array(lessonSnapshotSegmentSchema),
  i_do: z.string().nullable(),
  we_do: z.string().nullable(),
  you_do_together: z.string().nullable(),
  you_do: z.string().nullable(),
  qsssa_question: z.string().nullable(),
  qsssa_signal: z.string().nullable(),
  qsssa_stem: z.string().nullable(),
  qsssa_share: z.string().nullable(),
  qsssa_assess: z.string().nullable(),
  homework: z.array(z.string()),
});
export type LessonSnapshot = z.infer<typeof lessonSnapshotSchema>;

// ── Assignment generation ───────────────────────────────────────────────

const generatedRubricCriterionSchema = z.object({
  criterion: z.string().min(1).max(300),
  points: z.number().int().min(1).max(100),
  description: z.string().max(1000).nullable(),
});

export const generatedAssignmentSchema = z.object({
  title: z.string().min(1).max(300),
  // Student-facing prompt/directions.
  instructions: z.string().min(1).max(4000),
  // Teacher-facing setup notes — never shown to students.
  teacher_directions: z.string().min(1).max(4000),
  // 1-15 criteria; matches the DB's validate_assignment_rubric() shape
  // (non-empty criterion, positive integer points, optional description).
  rubric: z.array(generatedRubricCriterionSchema).min(1).max(15),
  answer_key: z.string().min(1).max(8000),
});
export type GeneratedAssignment = z.infer<typeof generatedAssignmentSchema>;

// ── TEKS semantic-matching suggestions ─────────────────────────────────

const teksMatchSchema = z.object({
  code: z.string().min(1).max(50),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string().min(1).max(300),
});

export const teksSuggestionsSchema = z.object({
  matches: z.array(teksMatchSchema).max(10),
});
export type TeksMatch = z.infer<typeof teksMatchSchema>;

// ── TEKS import (raw pasted standards text → structured rows) ──────────

const teksImportRowSchema = z.object({
  code: z.string().min(1).max(50),
  description: z.string().min(1).max(2000),
});

export const teksImportResultSchema = z.object({
  rows: z.array(teksImportRowSchema).max(300),
});
export type TeksImportRow = z.infer<typeof teksImportRowSchema>;

// ── Assessment generation ────────────────────────────────────────────────

// No `id` here — the model never assigns question ids, the app does
// (crypto.randomUUID() at generation time) so every question has a
// stable key regardless of how it was created.
export const generatedQuestionSchema = z.object({
  type: z.enum(QUESTION_TYPES),
  prompt: z.string().min(1).max(2000),
  points: z.number().int().min(1).max(100),
  // multiple_choice only — 2-8 answer choices.
  options: z.array(z.string().min(1).max(300)).min(2).max(8).nullable(),
  // multiple_choice/true_false/calculation/short_response: the correct
  // answer as text. Null for essay/scenario_analysis/performance_task,
  // where "correct" isn't a single fixed string.
  correct_answer: z.string().max(1000).nullable(),
  // matching only — 2-15 left/right pairs.
  pairs: z
    .array(z.object({ left: z.string().min(1).max(300), right: z.string().min(1).max(300) }))
    .min(2)
    .max(15)
    .nullable(),
});
export type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

export const generatedAssessmentSchema = z.object({
  title: z.string().min(1).max(300),
  questions: z.array(generatedQuestionSchema).min(1).max(50),
  answer_key: z.string().min(1).max(8000),
});
export type GeneratedAssessment = z.infer<typeof generatedAssessmentSchema>;
