import type {
  AssessmentVariant,
  AssignmentType,
  EngagementLevel,
  LessonSegmentKey,
  PacingAccuracy,
  PrepCategory,
  PrepPriority,
  QuestionType,
  TeksMasteryStatus,
} from "@/types/supabase";

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

/**
 * The 20 assignment types this course toolkit covers. Order here is the
 * single source of truth for display order everywhere (type filter
 * dropdowns, the generate form's type picker) — same role SEGMENT_ORDER
 * plays for lesson segments above.
 */
export const ASSIGNMENT_TYPES = [
  "classwork",
  "homework",
  "project",
  "guided_notes",
  "worksheet",
  "spreadsheet",
  "card_sort",
  "simulation",
  "game",
  "case_study",
  "research",
  "presentation",
  "exit_ticket",
  "quiz",
  "test",
  "lab_investigation",
  "debate",
  "socratic_seminar",
  "reflection_journal",
  "peer_review",
] as const satisfies readonly AssignmentType[];

export const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  classwork: "Classwork",
  homework: "Homework",
  project: "Project",
  guided_notes: "Guided Notes",
  worksheet: "Worksheet",
  spreadsheet: "Spreadsheet",
  card_sort: "Card Sort",
  simulation: "Simulation",
  game: "Game",
  case_study: "Case Study",
  research: "Research",
  presentation: "Presentation",
  exit_ticket: "Exit Ticket",
  quiz: "Quiz",
  test: "Test",
  lab_investigation: "Lab / Investigation",
  debate: "Debate",
  socratic_seminar: "Socratic Seminar",
  reflection_journal: "Reflection / Journal",
  peer_review: "Peer Review",
};

/**
 * TEKS mastery progression. `not_started` and `needs_reteaching` are both
 * "off the happy path" (never begun / regressed) and sort first/last
 * respectively; the other four are the real progression in order. This
 * order is the single source of truth for the mastery grid's column order
 * and the dashboard chart's stage order.
 */
export const MASTERY_STATUSES = [
  "not_started",
  "introduced",
  "practiced",
  "assessed",
  "mastered",
  "needs_reteaching",
] as const satisfies readonly TeksMasteryStatus[];

export const MASTERY_STATUS_LABELS: Record<TeksMasteryStatus, string> = {
  not_started: "Not Started",
  introduced: "Introduced",
  practiced: "Practiced",
  assessed: "Assessed",
  mastered: "Mastered",
  needs_reteaching: "Needs Reteaching",
};

/**
 * A student counts as "below mastery" for the struggling-TEKS view if
 * their status is anywhere in this set — everything except `mastered`
 * itself. `needs_reteaching` counts too (it's a regression, not progress).
 */
export const BELOW_MASTERY_STATUSES: readonly TeksMasteryStatus[] = [
  "not_started",
  "introduced",
  "practiced",
  "assessed",
  "needs_reteaching",
];

/**
 * How many students below mastery on one TEKS code before it's flagged as
 * "struggling" on the dashboard. A single struggling student is normal;
 * multiple is a pattern worth a teacher's attention.
 */
export const STRUGGLING_TEKS_THRESHOLD = 2;

/**
 * The 8 assessment question types. Order is the single source of truth
 * for display order (the question-type picker in the editor).
 */
export const QUESTION_TYPES = [
  "multiple_choice",
  "true_false",
  "matching",
  "calculation",
  "short_response",
  "scenario_analysis",
  "essay",
  "performance_task",
] as const satisfies readonly QuestionType[];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  matching: "Matching",
  calculation: "Calculation",
  short_response: "Short Response",
  scenario_analysis: "Scenario Analysis",
  essay: "Essay",
  performance_task: "Performance Task",
};

export const ASSESSMENT_VARIANT_LABELS: Record<AssessmentVariant, string> = {
  original: "Original",
  retake: "Retake",
  modified: "Modified",
};

export const PACING_ACCURACY_OPTIONS = [
  "too_fast",
  "just_right",
  "too_slow",
] as const satisfies readonly PacingAccuracy[];

export const PACING_ACCURACY_LABELS: Record<PacingAccuracy, string> = {
  too_fast: "Too Fast",
  just_right: "Just Right",
  too_slow: "Too Slow",
};

export const ENGAGEMENT_LEVEL_OPTIONS = [
  "low",
  "medium",
  "high",
] as const satisfies readonly EngagementLevel[];

export const ENGAGEMENT_LEVEL_LABELS: Record<EngagementLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const PREP_CATEGORIES = [
  "materials_to_print",
  "materials_to_cut",
  "tech_to_test",
  "supplies_needed",
] as const satisfies readonly PrepCategory[];

export const PREP_CATEGORY_LABELS: Record<PrepCategory, string> = {
  materials_to_print: "Materials to Print",
  materials_to_cut: "Materials to Cut",
  tech_to_test: "Tech to Test",
  supplies_needed: "Supplies Needed",
};

export const PREP_PRIORITIES = [
  "low",
  "medium",
  "high",
] as const satisfies readonly PrepPriority[];

export const PREP_PRIORITY_LABELS: Record<PrepPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};
