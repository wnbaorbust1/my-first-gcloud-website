import type { AssignmentType, LessonSegmentKey } from "@/types/supabase";

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
