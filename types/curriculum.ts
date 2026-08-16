import type { Database } from "@/types/supabase";

export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Unit = Database["public"]["Tables"]["units"]["Row"];
export type Week = Database["public"]["Tables"]["weeks"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonSegment = Database["public"]["Tables"]["lesson_segments"]["Row"];
export type Teks = Database["public"]["Tables"]["teks"]["Row"];
export type Assignment = Database["public"]["Tables"]["assignments"]["Row"];
export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type Class = Database["public"]["Tables"]["classes"]["Row"];
export type Student = Database["public"]["Tables"]["students"]["Row"];
export type Grade = Database["public"]["Tables"]["grades"]["Row"];
export type TeksMastery = Database["public"]["Tables"]["teks_mastery"]["Row"];
export type Reflection = Database["public"]["Tables"]["reflections"]["Row"];
export type PrepItem = Database["public"]["Tables"]["prep_items"]["Row"];
export type PortfolioItem = Database["public"]["Tables"]["portfolio_items"]["Row"];
export type BellRinger = Database["public"]["Tables"]["bell_ringers"]["Row"];
export type SimulationScenario = Database["public"]["Tables"]["simulation_scenarios"]["Row"];
export type SimulationAssignment = Database["public"]["Tables"]["simulation_assignments"]["Row"];
export type SimulationRun = Database["public"]["Tables"]["simulation_runs"]["Row"];

/** Shape of one simulation_scenarios.fixed_expenses entry (stored as jsonb). */
export type SimulationExpense = { label: string; amount: number };
/** Shape of one simulation_scenarios.event_deck option (stored as jsonb). */
export type SimulationOption = { label: string; impact: number };
/** Shape of one simulation_scenarios.event_deck entry (stored as jsonb). */
export type SimulationEvent = { round: number; prompt: string; options: SimulationOption[] };
/** Shape of one simulation_runs.decisions_log entry (stored as jsonb). */
export type SimulationDecision = {
  round: number;
  prompt: string;
  choice_label: string;
  impact: number;
  balance_after: number;
};

export type UnitWithWeeks = Unit & { weeks: Week[] };

export type WeekWithLessons = Week & { lessons: Lesson[] };

export type LessonDetail = Lesson & {
  segments: LessonSegment[];
  teks: Teks[];
};

export type UnitWithAssignments = Unit & { assignments: Assignment[] };

export type UnitWithAssessments = Unit & { assessments: Assessment[] };

export type ClassWithStudents = Class & { students: Student[] };
