import type { LessonSegmentKey } from "@/types/supabase";

/**
 * Fixed bell-to-bell order for the 6 class-period segments. The enum
 * itself has no inherent order in Postgres/PostgREST responses, so this
 * is the single source of truth for display order everywhere.
 */
export const SEGMENT_ORDER: LessonSegmentKey[] = [
  "bell_ringer",
  "mini_lesson",
  "modeling",
  "activity",
  "debrief",
  "exit_ticket",
];

export const SEGMENT_LABELS: Record<LessonSegmentKey, string> = {
  bell_ringer: "Bell Ringer",
  mini_lesson: "Mini Lesson",
  modeling: "Modeling",
  activity: "Activity",
  debrief: "Debrief",
  exit_ticket: "Exit Ticket",
};

export const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

export const LESSON_CLASS_PERIOD_MINUTES = 70;
export const HOMEWORK_QUESTION_COUNT = 5;
